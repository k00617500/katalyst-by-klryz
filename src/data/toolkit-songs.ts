export interface ToolkitSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
  uri: string;
  /** Semitone offsets from the song's root note — an original motif, not a transcription of the real recording. */
  motif: number[];
  /** Deterministic pseudo-tempo (BPM) used to pace the tile flashes on devices that can't capture tab audio. */
  bpm: number;
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

// A believable pop-song tempo range, picked deterministically per track id.
const BPM_MIN = 92;
const BPM_MAX = 136;

function bpmFor(id: string): number {
  return BPM_MIN + (hashId(id) % (BPM_MAX - BPM_MIN + 1));
}

// Titles, artists and cover art scraped from Spotify's public "Viral Hits Philippines" playlist
// (open.spotify.com/playlist/37i9dQZF1DXe3Jzj3uus9u) — every track its anonymous web view exposes.
const RAW_SONGS: Array<Omit<ToolkitSong, "uri" | "motif" | "bpm">> = [
  { id: "2WcvtyPOIM3ubJeIF2pRDr", title: "Sobra-Sobra", artist: "CARMELLE", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851e2c108070cd75a07ee1b3b67" },
  { id: "7mfaRuBDtbywhmLSoPSscp", title: "Unang Kilig", artist: "BINI", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851bd2925ff9a38cdf6c8d35acf" },
  { id: "15lHQGq4FT6y0N2hzTjJOs", title: "VISA", artist: "SB19", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b7f16758509aa943a33fbcf9" },
  { id: "1824ElVTa8XiWOjOlujl81", title: "Hong Kong (feat. 王菲季候風)", artist: "The Weeknd", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048516efeca949a59b3b4dc25cf8e" },
  { id: "7CZj1IKuxIdu1HmQQfnEwc", title: "Di Kita Trip", artist: "Lynx", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048512a7025000dec00b47cce31ad" },
  { id: "1GZnoLPpR9p2CwclsZnOXD", title: "'Cause You Have To", artist: "LANY", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048518d013d6d163279f56f54c7b5" },
  { id: "4nlE7j1Zsc3XJkoLE7FDhJ", title: "FIRESTARTER - League of Legends", artist: "SB19", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d0000485173515fc92d9340eccfb09f2c" },
  { id: "7D2ZnXa4KgOg68ojItelCe", title: "Closer", artist: "GEHLEE", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851d50449aac071e64a5590be3e" },
  { id: "1wlIPAmudv2w1jVkKSBl8m", title: "Bodybag", artist: "Uncle Dags, Chello", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485116760f8c4f2756dedbb10e97" },
  { id: "3l1grOhgJQG4E1E2MjfHWG", title: "XXL", artist: "LANY", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048518d013d6d163279f56f54c7b5" },
  { id: "79QUyi043DxZVoVy50Ny61", title: "Kung Ayaw", artist: "Jan Roberts", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048519a7392eca56fd7437889f55e" },
  { id: "747Uc7rr4TTUsi8YxGj0yz", title: "COUNT 2 10", artist: "Gaspari, HELLMERRY", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851d0a189203c859e01d8934349" },
  { id: "5uU9RcqmUxm8z8coudZ8eN", title: "Angel Of My Dreams", artist: "JADE", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851e5f98f2ca43a2abadf80ac51" },
  { id: "5f9Nt75lq1MLzf5F2xJwTI", title: "Prettiest Thing I’ve Ever Seen", artist: "LANY", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851bfa8a400e5931042691af196" },
  { id: "5U3UOiWDos9P2NWV7xTNwJ", title: "Na Para Bang", artist: "Mariah Deborah", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b359ef1d8e115b8cd32e592a" },
  { id: "23yRNRMM5BrsvKx7CCxfuZ", title: "FAMOUS RICH", artist: "THUGSTA, Uncle Dags", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851f778053554161be180c7796d" },
  { id: "1EqRuhrJZU5R7aeWyw1z8D", title: "ako ang bagyo", artist: "SHEAN", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048518accea63a5492488f764e8fb" },
  { id: "2sFepQNyl1WjpROruP8bJ0", title: "Housewife", artist: "Tate McRae", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851f2d3185e46b03c243f60ce53" },
  { id: "2gJ9yQunku9U74uOkWK2og", title: "Buenos Dias", artist: "Uncle Dags, Fern.", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048515eb409cccbab0bbcbeedfa42" },
  { id: "3zOYmiNOuyDL0ClxJcEJ0T", title: "Stop The Wedding!", artist: "Ashe", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048510893a0c33fd4b8497b0ef2f6" },
  { id: "0D5huw4lFGtUfCkf91rGvQ", title: "Mahal Magmahal", artist: "Esremborak", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048515f0dbc0f25b0af5a51b53c55" },
  { id: "3chBLXLQgj1KB2h1KgQxmF", title: "Baby 123", artist: "RAPROJECT SIX, MADAM SAUCE", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851ca852dfb68191de84c37b404" },
  { id: "4z928BtE4j1bjhcX9RU44M", title: "Kabisado", artist: "IV OF SPADES", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485114708b669227cf0b2c458946" },
  { id: "1y2t6CYXp7llG3fnhTkQOl", title: "Hangin", artist: "Yno", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485133c7c7a3503c8d1eb8343050" },
  { id: "0OzQ6q4AErZG5kJGA3wbcN", title: "Ngiti", artist: "The Juans", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851b67aca371529afe764599b7d" },
  { id: "4legZBvlei0pwnrzzxMzol", title: "Ikaw Lang", artist: "NOBITA", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048514a695a117d6531e4c384da00" },
  { id: "1m88BekjzGQQsuaMecZnVO", title: "ICED COFFEE O MANGO SHAKE", artist: "Hev Abi", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048516720d9719105767bff925c52" },
  { id: "0W8O4eQ5HJkIzKn86igTQo", title: "Pangako", artist: "Kyle Echarri", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851a49fe0d9eda4d458fab598c1" },
  { id: "5TGaPefQfu1Z2exPWU96Vf", title: "Star Song", artist: "Rob Deniel", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851772bffe3e040288f564a58aa" },
  { id: "1udOOSbJnytCdgvbgYOF5s", title: "Kalapastangan", artist: "fitterkarma", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485101cb2e736602194466522135" },
  { id: "46i8ZYPRekK8tmaXJO6M9r", title: "Angel Of My Dreams", artist: "JADE", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048513dd1c8af6ed2b0affa7cf4c0" },
  { id: "4yzDFThA5Xd1s9aZzwyxCk", title: "Since Day One", artist: "Skusta Clee, Flow G", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851fcf257c309992480a08120c6" },
  { id: "5b5cPscqVEMChvDqscVw26", title: "Training Season", artist: "Dua Lipa", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048512f8790ed72296c2614607575" },
  { id: "6bznn1zsUOWLka1k0XqNPc", title: "Blow My Mind", artist: "BLAZiNBONE, Louie Grammz", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048512365faddc1b43e6712ac9a28" },
  { id: "1zMUvVkAyYw9NTwDw72Ode", title: "Syempre", artist: "Willie Revillame", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485158a5ba121bb23fe2aa42a27a" },
  { id: "1GSv3y0eL50grXOaro8BTn", title: "Multo (Stripped Down)", artist: "Cup of Joe", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851e2c8393d10e824d658eac4af" },
  { id: "02HyFYmpzt02VJ8k0CqxKj", title: "Ain't In LA", artist: "ADÉLA", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b176fc721e1faba78b1ef35b" },
  { id: "0QPdjsMOUhwouq1NS3HwfQ", title: "Coming Up Roses", artist: "Harry Styles", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485174959140f550b11049c18a38" },
  { id: "63gCdrDtZlt1PMIGrzYEqt", title: "Love Options", artist: "BESTie", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851ffffd73723e720ebc9117046" },
  { id: "2009X8GyWTqyxIdzAEYW6N", title: "The One That Got Away", artist: "Katy Perry", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048511d955011a3ed477dc77865ad" },
  { id: "7MamPMGJwlY62QyC9M5esV", title: "Cool Off", artist: "Yeng Constantino", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048516edba5a2524763e64e97d9a4" },
  { id: "3XPhjx5P6Le2hPtVggY38F", title: "Muli (Secret Verse)", artist: "Ace Banzuelo", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048511c7e95704e339c872c87d7b1" },
  { id: "2Fsh0WRlXMWsc6PElFzvlo", title: "SALINGPUSA", artist: "Matt Habit", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851e9a47b319d927ccf13c0ba3a" },
  { id: "5y2ijHECwFYWqcAHKTZgzD", title: "Risk It All", artist: "Bruno Mars", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048513eb8dc748f7efb1470f74395" },
  { id: "4ciwlQ4UYHUMj2wuH0ffw6", title: "Thinking Of You", artist: "Katy Perry", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851df35c65d88dfacb5798f7291" },
  { id: "16E9xFP8csyjHwFhKmpGMj", title: "Tenchu", artist: "Esremborak", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851006573230bec9490c7225b90" },
  { id: "2gYTC8DsplN3RNdpdBcCOQ", title: "Die On This Hill", artist: "SIENNA SPIRO", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048510901e50bfaff4351a29f462b" },
  { id: "5sxzyd1SIx7COY68mfEO3y", title: "Alam Ko Na", artist: "DENȲ, Just Hush, Third Flo'", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851a1e7647952d6e88c529e688a" },
  { id: "3Fu4WzdH4SpUUPLroN4qyS", title: "Totoong tayo", artist: "Jin DC", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048515ab7eb8a65440bbfc0ff8e1a" },
  { id: "1iTLA7UKQw3BM9LpfRU8x0", title: "Puede Nang Mangarap", artist: "Lyca Gairanod", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048510b2b468adbcbeff2a49bf236" },
  { id: "7Hc6qcJG4NtyZgbNvQyd8U", title: "drop dead", artist: "Olivia Rodrigo", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048511a1495ff41046065b9475366" },
  { id: "6sGIMrtIzQjdzNndVxe397", title: "So Easy (To Fall In Love)", artist: "Olivia Dean", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048519a336bfb6d40bbd90a507417" },
  { id: "6QFCMUUq1T2Vf5sFUXcuQ7", title: "Beauty And A Beat", artist: "Justin Bieber, Nicki Minaj", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851f1d02a6cec967f8b6b78f76e" },
  { id: "2NP0WCHeIjBi3oC7MruePl", title: "Autumn (Reimagined)", artist: "Ben&Ben", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851db2c63312b143c0acf9b8e31" },
  { id: "0eAuGrXyGFYwur9ARUe7LJ", title: "Earrings", artist: "Malcolm Todd", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048512c1f34ecc1929fb59908aad1" },
  { id: "70cHKK8bHAfJrOGVnfRG9J", title: "Nicole Kidman", artist: "ADÉLA", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851ac9d5d5263e9f03802d6864c" },
  { id: "6CNF6SXpaPvKvUHTZaQClG", title: "POLITE", artist: "Full Circle Boys", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851ae012e620bc77adffc8e4687" },
  { id: "1RNCibCOmM49zenUyBXSLy", title: "Pwede Ka Ba?", artist: "Frank Ely", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048511f51b7e3d36e708235df20ac" },
  { id: "5CgwESmg9qgxDSa7RBQxFb", title: "Nang Iwan", artist: "This Band", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851a8ae5a1119f570f90d05e372" },
  { id: "7o1BMqnl3zLTd7RrF4oVTg", title: "Rosas", artist: "Yuridope, Skusta Clee", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b8bae6553d170668a5202696" },
  { id: "6C6F2oA7cmZKqq26FPGl0J", title: "Tala", artist: "Sarah Geronimo", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851dd6e82e86e2d9afc739966bc" },
  { id: "7tICCrK3CcyRFKza7yrR0z", title: "Homewrecker", artist: "sombr", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048519a8d41dca4c7d0ef23d76dd7" },
  { id: "6DH13QYXK7lKkYHSU88N48", title: "Who Knows", artist: "Daniel Caesar", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048512bad6e56e77d5bef0aa3f2dc" },
  { id: "0jByCc9MS4p34rE3o9Cdmw", title: "Pahintulot", artist: "shirebound", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485105607a2aa0f351108ff921d9" },
  { id: "71b7gpfBHekpvpZMSxqMTT", title: "TMA", artist: "groundZERO Records, Tyler, Primera, ODP", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851cb3e3efd5ace7aa95ae01f23" },
  { id: "4LfCY65LvojKjWEnU7fNN4", title: "stupid song", artist: "Olivia Rodrigo", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048515cf234eeb7a2edf44bf64a46" },
  { id: "4vVTI94F9uJ8lHNDWKv0i2", title: "Eenie Meenie", artist: "Sean Kingston, Justin Bieber", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048514dea4c1cdf30c359dbaec318" },
  { id: "43AjF7Xceu7Jr8hH2vriS1", title: "Kahit Na Umulan", artist: "Fern.", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851d746cc9611baeea9bc7d69f7" },
  { id: "6740F9FsmpoNCjbOchwM8o", title: "Weng Weng", artist: "Uncle Dags, Gaspari", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485114795c6392bb3090c435943b" },
  { id: "3ZlNQInM55B1xcnTlSi7kQ", title: "Hasta La Vista", artist: "Uncle Dags, J-High, Big Lane", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851805bc9a9a9e5d18ee1699557" },
  { id: "2jWcAQf0CYiZCxGfTGx1hd", title: "Ale", artist: "The Bloomfields", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048514c24cfc89324e43fa71479e5" },
  { id: "31IKMjvv6Oskp4hjGVeYsT", title: "Pure", artist: "SIENNA SPIRO", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b09eea420767969b6729962b" },
  { id: "2lpygKqzPFtItQ4ss3cgfb", title: "Cinderella (feat. Ty Dolla $ign)", artist: "Mac Miller, Ty Dolla $ign", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048512e92f776279eaf45d14a33fd" },
  { id: "0tNsICeicv2tSuxd1fX9S5", title: "Bakit Nga Ba Mahal Kita", artist: "Roselle Nava", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851d17de94d3fc6aa074cefa92b" },
  { id: "5INJWPDC31rn7ebGRQ0rN9", title: "Kailan Ka Uuwi (feat. Flow G)", artist: "juan karlos, Flow G", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048513f5b500e59514c33d1d17139" },
  { id: "432pM7gIHQmksVaU3B50pN", title: "What if I miss you for the rest of my life?", artist: "Janine Berdin", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d0000485101886dde8fa700dbe25b5b25" },
  { id: "49JeKZqejPtqJKpK7x9Ew4", title: "Patient Zero", artist: "Taylor Swift", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b2de0f5e12f0b369fde79953" },
  { id: "3FejwInTNiOxTOu0b8V3XX", title: "Favorite Vice", artist: "Arthur Nery, Meeks", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d0000485142e5650e26741490a0d96302" },
  { id: "3TCKsNjab1MhAJvCAmNEEd", title: "Alabang", artist: "RAPROJECT SIX", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048519d63d02008e91aea1e3f158a" },
  { id: "7dfdFXTFrHUfsS6ff6RQgb", title: "Halik Sobrang Diin Pt. 2", artist: "Gat Putch, Louie Grammz, Mi'Kel", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485112fc73f7a20f65645d538927" },
  { id: "4FuM2scDnJbWn6Az9UQ6aD", title: "Driftstar", artist: "Flow G", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851c66f8d7ba73725488e6ec6c6" },
  { id: "6QletrrmpkUpeJkipX9pgf", title: "Cha Cha Cha", artist: "Bruno Mars", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048513eb8dc748f7efb1470f74395" },
  { id: "5ViLKrbyL3HD6wsq3AB9eI", title: "WHITE KEYS", artist: "Dominic Fike", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048513696096119ef08824cf85ede" },
  { id: "22NHkFYbgxB2Zirj29Gbp8", title: "oh yeah?", artist: "Steve Lacy", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d000048514ea9ba86cd9506a004bab042" },
  { id: "2IlazGVPA8k8BctSlwM5QI", title: "Tayong dalawa", artist: "AJE", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485194d839067e3f416c96bb5694" },
  { id: "6dz4FTaIgrPIk7lfphecQh", title: "Summer Crush", artist: "HELLMERRY", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851c3857d4eec0e38b496b06ef8" },
  { id: "221LRlPHPuevgE1tuUlof9", title: "I Want You Back - Radio Edit", artist: "*NSYNC", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851186b235052f031900c5cb282" },
  { id: "5SP5KThPVkwB4QHxQW0g04", title: "Tamaraw", artist: "Uncle Dags, kkram", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851cde8fa11a1bbf55508b9aa8e" },
  { id: "2uOEendbLHR18khIbwooJ1", title: "The Apartment We Won't Share", artist: "NIKI", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851d3997a4c208ac08dafff374f" },
  { id: "55ij7wjoz4xgzvJO2hV7Y8", title: "Babaero", artist: "leanne", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851d93b0aa9e908c5e32691d594" },
  { id: "3iSa7VCFrQiaG2SUqHeaYw", title: "Banana", artist: "GA Chillerong Ghetto, Paul N Ballin", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851799dd7f52beb40c16a3b4d6e" },
  { id: "1m4zRUexgXzzpI9Sb94bgz", title: "Shuloks", artist: "RAPROJECT SIX", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851692608e57a03a36966627bfe" },
  { id: "1DwscornXpj8fmOmYVlqZt", title: "Stateside + Zara Larsson", artist: "PinkPantheress, Zara Larsson", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851684ecc5bc1b724d0106ad694" },
  { id: "7BMDIaCX8e8t8eTkUXB1IM", title: "Bow Bow Bow", artist: "ZEDDY WILL", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851596ad9f1ab08a1416f928006" },
  { id: "5xYpEeGFXmkGMBQ22NfKfO", title: "Keep Me", artist: "Novo Amor", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000485170c5f7f71006175627ab9077" },
  { id: "5yvVYFDUpbnjcnRBgjwTzM", title: "Dracula (with JENNIE)", artist: "Tame Impala, JENNIE", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851c7c031ce9d06b131f8563676" },
  { id: "0XYALktGbnHJ1TdW0Oz5KN", title: "What If I Call (Merry Christmas, i miss you)", artist: "Alex Crichton", cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00004851b5542f97bd2a2663e9305535" },
  { id: "64yMq9uyHZKSxaM4eRIrv1", title: "Chinay", artist: "La Mave", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00004851984ad11f1cdf88d6c32ee60e" },
  { id: "3zBdVzYsuqVPyMk1YFiPcg", title: "What If I Call", artist: "Alex Crichton", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d0000485154eb62b85844cd19c533d245" },
  { id: "0UOG0zUn7t8m8QcxfzR7AH", title: "Merry Christmas, Please Don't Call", artist: "Bleachers", cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d000048517fbed05d7226834da74c652b" },
];

// Fallback snapshot; the live list from /api/toolkit-songs replaces it as soon as it loads.
export function createToolkitSong(song: Omit<ToolkitSong, "uri" | "motif" | "bpm">): ToolkitSong {
  return {
    ...song,
    uri: `spotify:track:${song.id}`,
    motif: motifFor(song.id),
    bpm: bpmFor(song.id),
  };
}

export const toolkitSongs = RAW_SONGS.map(createToolkitSong);
