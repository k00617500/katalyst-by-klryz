export interface ToolkitSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
  uri: string;
  /** Semitone offsets from the song's root note — an original motif, not a transcription of the real recording. */
  motif: number[];
}

// A short, original melodic phrase per song. Deterministically picked from a small palette by the track's own
// Spotify id, so the same song always gets the same motif. These are NOT transcriptions of the real recordings —
// we have no way to extract the actual melody from streamed audio, and reproducing a song's real melody note-for-note
// would reproduce its protected musical content, which we won't do.
const MOTIF_PALETTE: number[][] = [
  [0, 4, 7],
  [0, 3, 7],
  [0, 5, 9],
  [0, -2, 3],
  [0, 2, 5],
  [0, 7, 10],
  [0, 4, 9],
  [0, -3, -7],
  [0, 3, 8],
  [0, 2, 7],
  [0, 5, 7],
  [0, -4, -7],
  [0, 9, 12],
  [0, 3, 10],
  [0, 6, 9],
];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function motifFor(id: string): number[] {
  return MOTIF_PALETTE[hashId(id) % MOTIF_PALETTE.length];
}

// Titles, artists and cover art scraped from Spotify's public "Viral Hits Philippines" playlist
// (open.spotify.com/playlist/37i9dQZF1DXe3Jzj3uus9u) — every track its anonymous web view exposes.
const RAW_SONGS: Array<Omit<ToolkitSong, "uri" | "motif">> = [
  { id: "7D2ZnXa4KgOg68ojItelCe", title: "Closer", artist: "GEHLEE", cover: "https://i.scdn.co/image/ab67616d00004851d50449aac071e64a5590be3e" },
  { id: "79QUyi043DxZVoVy50Ny61", title: "Kung Ayaw", artist: "Jan Roberts", cover: "https://i.scdn.co/image/ab67616d000048519a7392eca56fd7437889f55e" },
  { id: "5uU9RcqmUxm8z8coudZ8eN", title: "Angel Of My Dreams", artist: "JADE", cover: "https://i.scdn.co/image/ab67616d00004851e5f98f2ca43a2abadf80ac51" },
  { id: "2sFepQNyl1WjpROruP8bJ0", title: "Housewife", artist: "Tate McRae", cover: "https://i.scdn.co/image/ab67616d00004851f2d3185e46b03c243f60ce53" },
  { id: "5U3UOiWDos9P2NWV7xTNwJ", title: "Na Para Bang", artist: "Mariah Deborah", cover: "https://i.scdn.co/image/ab67616d00004851b359ef1d8e115b8cd32e592a" },
  { id: "1EqRuhrJZU5R7aeWyw1z8D", title: "ako ang bagyo", artist: "SHEAN", cover: "https://i.scdn.co/image/ab67616d000048518accea63a5492488f764e8fb" },
  { id: "2gJ9yQunku9U74uOkWK2og", title: "Buenos Dias", artist: "Uncle Dags, Fern.", cover: "https://i.scdn.co/image/ab67616d000048515eb409cccbab0bbcbeedfa42" },
  { id: "3zOYmiNOuyDL0ClxJcEJ0T", title: "Stop The Wedding!", artist: "Ashe", cover: "https://i.scdn.co/image/ab67616d000048510893a0c33fd4b8497b0ef2f6" },
  { id: "0D5huw4lFGtUfCkf91rGvQ", title: "Mahal Magmahal", artist: "Esremborak", cover: "https://i.scdn.co/image/ab67616d000048515f0dbc0f25b0af5a51b53c55" },
  { id: "3chBLXLQgj1KB2h1KgQxmF", title: "Baby 123", artist: "RAPROJECT SIX, MADAM SAUCE", cover: "https://i.scdn.co/image/ab67616d00004851ca852dfb68191de84c37b404" },
  { id: "4z928BtE4j1bjhcX9RU44M", title: "Kabisado", artist: "IV OF SPADES", cover: "https://i.scdn.co/image/ab67616d0000485114708b669227cf0b2c458946" },
  { id: "1y2t6CYXp7llG3fnhTkQOl", title: "Hangin", artist: "Yno", cover: "https://i.scdn.co/image/ab67616d0000485133c7c7a3503c8d1eb8343050" },
  { id: "0OzQ6q4AErZG5kJGA3wbcN", title: "Ngiti", artist: "The Juans", cover: "https://i.scdn.co/image/ab67616d00004851b67aca371529afe764599b7d" },
  { id: "4legZBvlei0pwnrzzxMzol", title: "Ikaw Lang", artist: "NOBITA", cover: "https://i.scdn.co/image/ab67616d000048514a695a117d6531e4c384da00" },
  { id: "1m88BekjzGQQsuaMecZnVO", title: "ICED COFFEE O MANGO SHAKE", artist: "Hev Abi", cover: "https://i.scdn.co/image/ab67616d00004851fedd8cdaf719923a0311a7fa" },
  { id: "0W8O4eQ5HJkIzKn86igTQo", title: "Pangako", artist: "Kyle Echarri", cover: "https://i.scdn.co/image/ab67616d00004851a49fe0d9eda4d458fab598c1" },
  { id: "5TGaPefQfu1Z2exPWU96Vf", title: "Star Song", artist: "Rob Deniel", cover: "https://i.scdn.co/image/ab67616d00004851772bffe3e040288f564a58aa" },
  { id: "1udOOSbJnytCdgvbgYOF5s", title: "Kalapastangan", artist: "fitterkarma", cover: "https://i.scdn.co/image/ab67616d0000485101cb2e736602194466522135" },
  { id: "46i8ZYPRekK8tmaXJO6M9r", title: "Angel Of My Dreams", artist: "JADE", cover: "https://i.scdn.co/image/ab67616d000048513dd1c8af6ed2b0affa7cf4c0" },
  { id: "4yzDFThA5Xd1s9aZzwyxCk", title: "Since Day One", artist: "Skusta Clee, Flow G", cover: "https://i.scdn.co/image/ab67616d00004851fcf257c309992480a08120c6" },
  { id: "5b5cPscqVEMChvDqscVw26", title: "Training Season", artist: "Dua Lipa", cover: "https://i.scdn.co/image/ab67616d000048512f8790ed72296c2614607575" },
  { id: "6bznn1zsUOWLka1k0XqNPc", title: "Blow My Mind", artist: "BLAZiNBONE, Louie Grammz", cover: "https://i.scdn.co/image/ab67616d000048512365faddc1b43e6712ac9a28" },
  { id: "1zMUvVkAyYw9NTwDw72Ode", title: "Syempre", artist: "Willie Revillame", cover: "https://i.scdn.co/image/ab67616d0000485158a5ba121bb23fe2aa42a27a" },
  { id: "1GSv3y0eL50grXOaro8BTn", title: "Multo (Stripped Down)", artist: "Cup of Joe", cover: "https://i.scdn.co/image/ab67616d00004851e2c8393d10e824d658eac4af" },
  { id: "02HyFYmpzt02VJ8k0CqxKj", title: "Ain't In LA", artist: "ADÉLA", cover: "https://i.scdn.co/image/ab67616d00004851b176fc721e1faba78b1ef35b" },
  { id: "0QPdjsMOUhwouq1NS3HwfQ", title: "Coming Up Roses", artist: "Harry Styles", cover: "https://i.scdn.co/image/ab67616d0000485174959140f550b11049c18a38" },
  { id: "63gCdrDtZlt1PMIGrzYEqt", title: "Love Options", artist: "BESTie", cover: "https://i.scdn.co/image/ab67616d00004851ffffd73723e720ebc9117046" },
  { id: "2009X8GyWTqyxIdzAEYW6N", title: "The One That Got Away", artist: "Katy Perry", cover: "https://i.scdn.co/image/ab67616d000048511d955011a3ed477dc77865ad" },
  { id: "7MamPMGJwlY62QyC9M5esV", title: "Cool Off", artist: "Yeng Constantino", cover: "https://i.scdn.co/image/ab67616d000048516edba5a2524763e64e97d9a4" },
  { id: "3XPhjx5P6Le2hPtVggY38F", title: "Muli (Secret Verse)", artist: "Ace Banzuelo", cover: "https://i.scdn.co/image/ab67616d000048511c7e95704e339c872c87d7b1" },
  { id: "2Fsh0WRlXMWsc6PElFzvlo", title: "SALINGPUSA", artist: "Matt Habit", cover: "https://i.scdn.co/image/ab67616d00004851e9a47b319d927ccf13c0ba3a" },
  { id: "5y2ijHECwFYWqcAHKTZgzD", title: "Risk It All", artist: "Bruno Mars", cover: "https://i.scdn.co/image/ab67616d000048513eb8dc748f7efb1470f74395" },
  { id: "4ciwlQ4UYHUMj2wuH0ffw6", title: "Thinking Of You", artist: "Katy Perry", cover: "https://i.scdn.co/image/ab67616d00004851df35c65d88dfacb5798f7291" },
  { id: "16E9xFP8csyjHwFhKmpGMj", title: "Tenchu", artist: "Esremborak", cover: "https://i.scdn.co/image/ab67616d00004851006573230bec9490c7225b90" },
  { id: "2gYTC8DsplN3RNdpdBcCOQ", title: "Die On This Hill", artist: "SIENNA SPIRO", cover: "https://i.scdn.co/image/ab67616d000048510901e50bfaff4351a29f462b" },
  { id: "5sxzyd1SIx7COY68mfEO3y", title: "Alam Ko Na", artist: "DENȲ, Just Hush, Third Flo'", cover: "https://i.scdn.co/image/ab67616d00004851a1e7647952d6e88c529e688a" },
  { id: "3Fu4WzdH4SpUUPLroN4qyS", title: "Totoong tayo", artist: "Jin DC", cover: "https://i.scdn.co/image/ab67616d000048515ab7eb8a65440bbfc0ff8e1a" },
  { id: "1iTLA7UKQw3BM9LpfRU8x0", title: "Puede Nang Mangarap", artist: "Lyca Gairanod", cover: "https://i.scdn.co/image/ab67616d000048510b2b468adbcbeff2a49bf236" },
  { id: "7Hc6qcJG4NtyZgbNvQyd8U", title: "drop dead", artist: "Olivia Rodrigo", cover: "https://i.scdn.co/image/ab67616d000048511a1495ff41046065b9475366" },
  { id: "6sGIMrtIzQjdzNndVxe397", title: "So Easy (To Fall In Love)", artist: "Olivia Dean", cover: "https://i.scdn.co/image/ab67616d000048519a336bfb6d40bbd90a507417" },
  { id: "6QFCMUUq1T2Vf5sFUXcuQ7", title: "Beauty And A Beat", artist: "Justin Bieber, Nicki Minaj", cover: "https://i.scdn.co/image/ab67616d00004851f1d02a6cec967f8b6b78f76e" },
  { id: "2NP0WCHeIjBi3oC7MruePl", title: "Autumn (Reimagined)", artist: "Ben&Ben", cover: "https://i.scdn.co/image/ab67616d00004851db2c63312b143c0acf9b8e31" },
  { id: "0eAuGrXyGFYwur9ARUe7LJ", title: "Earrings", artist: "Malcolm Todd", cover: "https://i.scdn.co/image/ab67616d000048512c1f34ecc1929fb59908aad1" },
  { id: "70cHKK8bHAfJrOGVnfRG9J", title: "Nicole Kidman", artist: "ADÉLA", cover: "https://i.scdn.co/image/ab67616d00004851ac9d5d5263e9f03802d6864c" },
  { id: "6CNF6SXpaPvKvUHTZaQClG", title: "POLITE", artist: "Full Circle Boys", cover: "https://i.scdn.co/image/ab67616d00004851ae012e620bc77adffc8e4687" },
  { id: "1RNCibCOmM49zenUyBXSLy", title: "Pwede Ka Ba?", artist: "Frank Ely", cover: "https://i.scdn.co/image/ab67616d000048511f51b7e3d36e708235df20ac" },
  { id: "5CgwESmg9qgxDSa7RBQxFb", title: "Nang Iwan", artist: "This Band", cover: "https://i.scdn.co/image/ab67616d00004851a8ae5a1119f570f90d05e372" },
  { id: "7o1BMqnl3zLTd7RrF4oVTg", title: "Rosas", artist: "Yuridope, Skusta Clee", cover: "https://i.scdn.co/image/ab67616d00004851b8bae6553d170668a5202696" },
  { id: "6C6F2oA7cmZKqq26FPGl0J", title: "Tala", artist: "Sarah Geronimo", cover: "https://i.scdn.co/image/ab67616d00004851dd6e82e86e2d9afc739966bc" },
  { id: "7tICCrK3CcyRFKza7yrR0z", title: "Homewrecker", artist: "sombr", cover: "https://i.scdn.co/image/ab67616d000048519a8d41dca4c7d0ef23d76dd7" },
  { id: "6DH13QYXK7lKkYHSU88N48", title: "Who Knows", artist: "Daniel Caesar", cover: "https://i.scdn.co/image/ab67616d000048512bad6e56e77d5bef0aa3f2dc" },
  { id: "0jByCc9MS4p34rE3o9Cdmw", title: "Pahintulot", artist: "shirebound", cover: "https://i.scdn.co/image/ab67616d0000485105607a2aa0f351108ff921d9" },
  { id: "71b7gpfBHekpvpZMSxqMTT", title: "TMA", artist: "groundZERO Records, Tyler, Primera, ODP", cover: "https://i.scdn.co/image/ab67616d00004851cb3e3efd5ace7aa95ae01f23" },
  { id: "4LfCY65LvojKjWEnU7fNN4", title: "stupid song", artist: "Olivia Rodrigo", cover: "https://i.scdn.co/image/ab67616d000048515cf234eeb7a2edf44bf64a46" },
  { id: "4vVTI94F9uJ8lHNDWKv0i2", title: "Eenie Meenie", artist: "Sean Kingston, Justin Bieber", cover: "https://i.scdn.co/image/ab67616d000048514dea4c1cdf30c359dbaec318" },
  { id: "43AjF7Xceu7Jr8hH2vriS1", title: "Kahit Na Umulan", artist: "Fern.", cover: "https://i.scdn.co/image/ab67616d00004851d746cc9611baeea9bc7d69f7" },
  { id: "6740F9FsmpoNCjbOchwM8o", title: "Weng Weng", artist: "Uncle Dags, Gaspari", cover: "https://i.scdn.co/image/ab67616d0000485114795c6392bb3090c435943b" },
  { id: "3ZlNQInM55B1xcnTlSi7kQ", title: "Hasta La Vista", artist: "Uncle Dags, J-High, Big Lane", cover: "https://i.scdn.co/image/ab67616d00004851805bc9a9a9e5d18ee1699557" },
];

// Note: Spotify's anonymous web view only exposes the first 58 of this playlist's 100 tracks without a logged-in
// session — that's a Spotify limit, not something a client-side script can lift. These 58 are every track it offers.
export function createToolkitSong(song: (typeof RAW_SONGS)[number]): ToolkitSong {
  return {
    ...song,
    uri: `spotify:track:${song.id}`,
    motif: motifFor(song.id),
  };
}

export const toolkitSongs = RAW_SONGS.map(createToolkitSong);
