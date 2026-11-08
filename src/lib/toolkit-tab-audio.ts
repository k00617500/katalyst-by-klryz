type CaptureDevices = MediaDevices & {
  setCaptureHandleConfig?: (config: { handle: string; permittedOrigins: string[] }) => void;
};

type CapturedTab = MediaStreamTrack & {
  getCaptureHandle?: () => { handle: string } | null;
};

type TabCaptureOptions = DisplayMediaStreamOptions & {
  audio: MediaTrackConstraints & { suppressLocalAudioPlayback: boolean; restrictOwnAudio: boolean };
  preferCurrentTab: boolean;
  systemAudio: "exclude";
  surfaceSwitching: "exclude";
};

export async function watchToolkitTabAudio(
  signal: AbortSignal,
  onPulse: () => void,
  onStop: (reason: "unsupported" | "retry") => void,
  onReady: (resetBeat: () => void) => void,
) {
  const devices = navigator.mediaDevices as CaptureDevices | undefined;
  if (!devices?.getDisplayMedia || !devices.setCaptureHandleConfig || !window.AudioContext || !window.AudioWorkletNode) {
    onStop("unsupported");
    return;
  }

  const handle = crypto.randomUUID();
  let context: AudioContext | undefined;
  let stream: MediaStream | undefined;
  let detector: AudioWorkletNode | undefined;
  let closed = false;
  let handleSet = false;

  const close = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener("abort", close);
    detector?.port.close();
    stream?.getTracks().forEach((track) => track.stop());
    void context?.close();
    if (handleSet) devices.setCaptureHandleConfig?.({ handle: "", permittedOrigins: [] });
    if (!signal.aborted) onStop("retry");
  };

  try {
    const audioContext = new AudioContext({ latencyHint: "interactive" });
    context = audioContext;
    devices.setCaptureHandleConfig({ handle, permittedOrigins: [location.origin] });
    handleSet = true;
    const ready = Promise.all([
      audioContext.resume(),
      audioContext.audioWorklet.addModule("/toolkit-onsets.js"),
    ]).then(() => true, () => false);
    signal.addEventListener("abort", close, { once: true });

    // Open the picker only from the beat-sync control. Keep normal playback audible.
    const options: TabCaptureOptions = {
      video: { displaySurface: "browser" },
      audio: { suppressLocalAudioPlayback: false, restrictOwnAudio: false },
      preferCurrentTab: true,
      systemAudio: "exclude",
      surfaceSwitching: "exclude",
    };
    stream = await devices.getDisplayMedia(options);
    const [tab] = stream.getVideoTracks() as CapturedTab[];
    const [audio] = stream.getAudioTracks();
    if (closed || !audio || !tab || tab.getCaptureHandle?.()?.handle !== handle) {
      stream.getTracks().forEach((track) => track.stop());
      close();
      return;
    }

    tab.addEventListener("ended", close, { once: true });
    tab.addEventListener("capturehandlechange", () => {
      if (tab.getCaptureHandle?.()?.handle !== handle) close();
    });
    audio.addEventListener("ended", close, { once: true });
    if (!(await ready) || closed || audio.readyState !== "live") {
      close();
      return;
    }

    const source = audioContext.createMediaStreamSource(new MediaStream([audio]));
    detector = new AudioWorkletNode(audioContext, "toolkit-onsets", {
      outputChannelCount: [1],
    });
    let acceptAfter = audioContext.currentTime;
    detector.addEventListener("processorerror", close, { once: true });
    detector.port.onmessage = ({ data }: MessageEvent<{ time: number }>) => {
      // Discard messages that accumulated while the page was blocked or in the background.
      if (!closed && !document.hidden && !audio.muted && data.time >= acceptAfter && audioContext.currentTime - data.time < 0.08) {
        onPulse();
      }
    };
    // The worklet leaves its output silent. Only Spotify plays through the speakers.
    source.connect(detector).connect(audioContext.destination);
    onReady(() => {
      if (closed) return;
      acceptAfter = audioContext.currentTime;
      detector?.port.postMessage("reset");
    });
  } catch {
    close();
  }
}
