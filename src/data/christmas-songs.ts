/**
 * Real Filipino Christmas songs for the Christmas tree and greeting card, played through Spotify's official embed.
 * Taken from the public "Paskong Pinoy Christmas Songs" playlist (open.spotify.com/playlist/0okZTy7Cyqek26yy7VMuFI).
 * Without a Spotify login the embed plays 30-second previews.
 */
export interface ChristmasTrack {
  id: string;
  title: string;
  artist: string;
}

export const CHRISTMAS_PLAYLIST_URL = "https://open.spotify.com/playlist/0okZTy7Cyqek26yy7VMuFI";

export const CHRISTMAS_TRACKS: ChristmasTrack[] = [
  { id: "2KzxMDcnxtzvqPUXxoe0h6", title: "Medley: Maligayang Pasko At Masaganang Bagong Taon / Namamasko …", artist: "APO Hiking Society" },
  { id: "0QiEomj7xsd9L87TUsN11u", title: "Kumukutikutitap", artist: "Joey Albert" },
  { id: "1BCRzKNBH1OA4at9RTSMJE", title: "Pasko Na Naman", artist: "Alpha All Stars" },
  { id: "7rrVN7f83kwaz2sGxoFnJY", title: "Christmas in Our Hearts", artist: "Jose Mari Chan" },
  { id: "52fLO73ZtNIukSZ7SBGMhp", title: "Sa Paskong darating", artist: "Mabuhay Singers" },
  { id: "4I57cV4giJmM7V9MenXkQB", title: "Star Ng Pasko", artist: "ABS-CBN Music All Star" },
  { id: "5F1Fi1NevW0Y7YBTPFeZCZ", title: "Ang Pasko Ay Sumapit", artist: "Bayanihan Philippine Dance Company" },
  { id: "2TMwa7JqgnTxo6koLACzjh", title: "Sana Ngayong Pasko", artist: "Ariel Rivera" },
  { id: "3SoXMvMIUpP4xrHfMFkc7i", title: "Kampana Ng Simbahan", artist: "Melodia" },
  { id: "5Par4FeLST6NRnEhupaM64", title: "Miss Kita Kung Christmas", artist: "Sharon Cuneta" },
  { id: "2DmudC4qSQCP6G4IZN2q92", title: "Noche Buena", artist: "Marco Sison" },
  { id: "6nCAuV8db9kn8S3TOlp5BA", title: "A Perfect Christmas", artist: "Jose Mari Chan" },
  { id: "3JYvvs6ZykdDOBTnoKmiYx", title: "O Magsaya (Joy to the World)", artist: "Bayanihan Philippine Dance Company" },
  { id: "1ijt0zh89uGr3xtoyMIOsH", title: "Tuloy Na Tuloy Pa Rin Ang Pasko", artist: "APO Hiking Society" },
  { id: "4BCG3MYDwbWucpxWdFkq5M", title: "Paskong Anong Saya", artist: "Verni Gonzales" },
  { id: "6LivYvzWanzTQm8Tm3aTsa", title: "Pasko Na Sinta Ko", artist: "Gary Valenciano" },
  { id: "5uao2OYOiCJ2YkEdLonp5w", title: "Misa De Gallo", artist: "Alpha All Stars" },
  { id: "0MLE0vuEmMNFO1CjVVVYqG", title: "Pasko Sa Nayon", artist: "Ivy Violan" },
  { id: "19jyDouBSkJ8XMafRiw656", title: "Sino Si Santa Claus", artist: "Florante" },
  { id: "5LomFFRtL3XMwqpf9hpsKW", title: "Nakaraang Pasko", artist: "Kuh Ledesma" },
  { id: "3xGYldTHbV4y2UG798aa8P", title: "Christmas Won't Be the Same Without You", artist: "Lani Misalucha" },
  { id: "5ocw1RHvbzWP4ZW41pbyZb", title: "Miss Kita Kung Christmas", artist: "Aiza Seguerra" },
  { id: "4PGPMhKd5NpurwzLwdUGG2", title: "Medley: Halina / Halina …", artist: "APO Hiking Society" },
  { id: "4DnMIwv4TMh7HHSrkVyetj", title: "We Wish You A Merry Christmas", artist: "Viva All Star" },
];
