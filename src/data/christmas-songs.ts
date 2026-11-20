/**
 * Christmas songs for the Christmas tree and greeting card, played through Spotify's official embed (30-second
 * previews without a Spotify login). Jose Mari Chan's Christmas songs and the best-known Christmas songs are played
 * most; other Filipino Christmas songs fill in.
 *   jmc  - Jose Mari Chan (the "Christmas in Our Hearts" album and a few more)
 *   hits - popular Christmas songs (from Topsify's "100 Greatest Christmas Songs Ever")
 *   opm  - other Filipino Christmas songs (from the "Paskong Pinoy Christmas Songs" playlist)
 */
export type ChristmasTier = "jmc" | "hits" | "opm";

export interface ChristmasTrack {
  id: string;
  title: string;
  artist: string;
  tier: ChristmasTier;
}

/** How often each group is chosen, as a share of all songs played. */
export const TIER_SHARE: Record<ChristmasTier, number> = { jmc: 0.45, hits: 0.35, opm: 0.2 };

export const CHRISTMAS_TRACKS: ChristmasTrack[] = [
  { id: "4fEXgMllT3kPL9G1DHfio0", title: "A Wish on Christmas Night", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "4Cff1H930SztVXGwzYbmT9", title: "Do You Hear What I Hear", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "6n7L1Z42MkjYNH2SpvGIq8", title: "Mary's Boy Child", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "6KGDFwNkPwn9hna1ZVyVVh", title: "Christmas in Our Hearts", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "6iMhx7NMPTZ9RmjoVaYMdQ", title: "A Chrismas Carol", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "1mxLXWTgj4KnRizl8HSgyp", title: "A Perfect Christmas", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "3rKZ1k6jpoZlpwCq68S9Rl", title: "Give Me Your Heart for Christmas", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "2g1VKQfSSrXMOntopqmNDC", title: "This Beautiful Day", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "3eRvUD5NfSyCTKQRsayv3Z", title: "The Sound of Life", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "6bI6xNscLF2j8Fz13i3UGt", title: "Christmas Children", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "6Yw8bWvoftuxKKeeXX8gxO", title: "Christmas Past", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "2wVyJyfPR3ekERzHbIzb79", title: "Little Christmas Tree", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "1peflSKqK5g0B1K0yMmdNg", title: "When a Child Is Born", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "3aPXYVdOB9jXr97STodh7y", title: "Going Home to Christmas", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "2vL0zwdcg0WyST3bIL3K7g", title: "Christmas Air (Instrumental)", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "3Z5VoFXPMssg3AIZeTCxL1", title: "Pagdating Ng Pasko", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "4hVNKGxq8vKmMsAAFM92xe", title: "Christmas Anyway (feat. Hanna Flores)", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "1xnmGcfShKxtClSfkMKJ4h", title: "December 25 (Instrumental)", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "4dTIX4OfjS2uEIRukvNuOB", title: "A Christmas Song for You", artist: "Jose Mari Chan", tier: "jmc" },
  { id: "0lLdorYw7lVrJydTINhWdI", title: "It's Beginning to Look a Lot like Christmas", artist: "Michael Bublé", tier: "hits" },
  { id: "2FRnf9qhLbvw8fu4IBXx78", title: "Last Christmas", artist: "Wham!", tier: "hits" },
  { id: "0bYg9bo50gSsH3LtXe2SQn", title: "All I Want for Christmas Is You", artist: "Mariah Carey", tier: "hits" },
  { id: "09OojFvtrM9YRzRjnXqJjA", title: "Rockin' Around the Christmas Tree", artist: "Brenda Lee", tier: "hits" },
  { id: "3hBXvHLlTHvnbwrPbeoyAj", title: "Jingle Bell Rock", artist: "Bobby Helms", tier: "hits" },
  { id: "6tjituizSxwSmBB5vtgHZE", title: "Holly Jolly Christmas", artist: "Michael Bublé", tier: "hits" },
  { id: "3VTNVsTTu05dmTsVFrmGpK", title: "Fairytale of New York (feat. Kirsty MacColl)", artist: "The Pogues", tier: "hits" },
  { id: "7MSYSOobsombc1mbDWFxtD", title: "This Christmas", artist: "Donny Hathaway", tier: "hits" },
  { id: "3Z3QhZAZpqwZa1phsbQ3JZ", title: "Driving Home for Christmas", artist: "Chris Rea", tier: "hits" },
  { id: "5hslUAKq9I9CG2bAulFkHN", title: "It's the Most Wonderful Time of the Year", artist: "Andy Williams", tier: "hits" },
  { id: "2X9ZDo30Mck6whr2WzaEME", title: "Feliz Navidad", artist: "The Tenors", tier: "hits" },
  { id: "2uFaJJtFpPDc5Pa95XzTvg", title: "Let It Snow! Let It Snow! Let It Snow!", artist: "Dean Martin", tier: "hits" },
  { id: "5ASM6Qjiav2xPe7gRkQMsQ", title: "Sleigh Ride", artist: "The Ronettes", tier: "hits" },
  { id: "3YZE5qDV7u1ZD1gZc47ZeR", title: "Underneath the Tree", artist: "Kelly Clarkson", tier: "hits" },
  { id: "4PS1e8f2LvuTFgUs1Cn3ON", title: "The Christmas Song (Merry Christmas To You)", artist: "Nat King Cole", tier: "hits" },
  { id: "5skPAf0IIIy7UXJch1QgZy", title: "White Christmas", artist: "The Drifters", tier: "hits" },
  { id: "27RYrbL6S02LNVhDWVl38b", title: "Happy Xmas (War Is Over)", artist: "John Lennon", tier: "hits" },
  { id: "4KV9bM7a1KDc7b7OakFZic", title: "Jingle Bells", artist: "Frank Sinatra", tier: "hits" },
  { id: "1TH5fhztFZmUGWaCXmZ6ie", title: "Deck The Halls", artist: "Nat King Cole", tier: "hits" },
  { id: "7L3OGWgJMQdXSbY3zgUt1Q", title: "O Holy Night", artist: "Ravyn Lenae", tier: "hits" },
  { id: "3QiAAp20rPC3dcAtKtMaqQ", title: "Blue Christmas", artist: "Elvis Presley", tier: "hits" },
  { id: "2TE4xW3ImvpltVU0cPcKUn", title: "Merry Christmas Everyone", artist: "Shakin' Stevens", tier: "hits" },
  { id: "2aHGuDMO9hQxgEPmDxxa7U", title: "Santa Claus Is Coming to Town (feat. Frank Sinatra)", artist: "Kylie Minogue", tier: "hits" },
  { id: "2pnPe4pJtq7689i5ydzvJJ", title: "Run Rudolph Run", artist: "Chuck Berry", tier: "hits" },
  { id: "6JY1Bv099vhkeAHuSjNlQJ", title: "O Holy Night", artist: "Josh Groban", tier: "hits" },
  { id: "2gciS7UJjv59l7608DFGNl", title: "Driving Home for Christmas", artist: "Dasha", tier: "hits" },
  { id: "0ff7TkB7PkCaGb2Ds2mNKl", title: "All I Want for Christmas Is You", artist: "VICTORIA", tier: "hits" },
  { id: "7hzgg84aVpUctPPcZTIH0S", title: "White Christmas", artist: "Say Now", tier: "hits" },
  { id: "5uPPCnnlCVwg0pDlPvUVfg", title: "Jingle Bell Rock", artist: "Blake Shelton", tier: "hits" },
  { id: "2KzxMDcnxtzvqPUXxoe0h6", title: "Medley: Maligayang Pasko At Masaganang Bagong Taon / Namamasko / Ang Pasko'Y Sumapit Na Naman / Dalangin Sa Pasko / Pasko Ng Madla / Mano Po Ninong / Pasko Na Naman / Pasko Na Naman", artist: "APO Hiking Society", tier: "opm" },
  { id: "0QiEomj7xsd9L87TUsN11u", title: "Kumukutikutitap", artist: "Joey Albert", tier: "opm" },
  { id: "1BCRzKNBH1OA4at9RTSMJE", title: "Pasko Na Naman", artist: "Alpha All Stars", tier: "opm" },
  { id: "52fLO73ZtNIukSZ7SBGMhp", title: "Sa Paskong darating", artist: "Mabuhay Singers", tier: "opm" },
  { id: "4I57cV4giJmM7V9MenXkQB", title: "Star Ng Pasko", artist: "ABS-CBN Music All Star", tier: "opm" },
  { id: "5F1Fi1NevW0Y7YBTPFeZCZ", title: "Ang Pasko Ay Sumapit", artist: "Bayanihan Philippine Dance Company", tier: "opm" },
  { id: "2TMwa7JqgnTxo6koLACzjh", title: "Sana Ngayong Pasko", artist: "Ariel Rivera", tier: "opm" },
  { id: "3SoXMvMIUpP4xrHfMFkc7i", title: "Kampana Ng Simbahan", artist: "Melodia", tier: "opm" },
  { id: "5Par4FeLST6NRnEhupaM64", title: "Miss Kita Kung Christmas", artist: "Sharon Cuneta", tier: "opm" },
  { id: "2DmudC4qSQCP6G4IZN2q92", title: "Noche Buena", artist: "Marco Sison", tier: "opm" },
  { id: "3JYvvs6ZykdDOBTnoKmiYx", title: "O Magsaya (Joy to the World)", artist: "Bayanihan Philippine Dance Company", tier: "opm" },
  { id: "1ijt0zh89uGr3xtoyMIOsH", title: "Tuloy Na Tuloy Pa Rin Ang Pasko", artist: "APO Hiking Society", tier: "opm" },
  { id: "4BCG3MYDwbWucpxWdFkq5M", title: "Paskong Anong Saya", artist: "Verni Gonzales", tier: "opm" },
  { id: "6LivYvzWanzTQm8Tm3aTsa", title: "Pasko Na Sinta Ko", artist: "Gary Valenciano", tier: "opm" },
  { id: "5uao2OYOiCJ2YkEdLonp5w", title: "Misa De Gallo", artist: "Alpha All Stars", tier: "opm" },
  { id: "0MLE0vuEmMNFO1CjVVVYqG", title: "Pasko Sa Nayon", artist: "Ivy Violan", tier: "opm" },
  { id: "19jyDouBSkJ8XMafRiw656", title: "Sino Si Santa Claus", artist: "Florante", tier: "opm" },
  { id: "5LomFFRtL3XMwqpf9hpsKW", title: "Nakaraang Pasko", artist: "Kuh Ledesma", tier: "opm" },
  { id: "3xGYldTHbV4y2UG798aa8P", title: "Christmas Won't Be the Same Without You", artist: "Lani Misalucha", tier: "opm" },
  { id: "5ocw1RHvbzWP4ZW41pbyZb", title: "Miss Kita Kung Christmas", artist: "Aiza Seguerra", tier: "opm" },
  { id: "4PGPMhKd5NpurwzLwdUGG2", title: "Medley: Halina / Halina / Pasko Kasi / Kami Po'S Paskuhan / Damdaming Pasko / Pasko'Y Laganap / Simula Ng Pasko", artist: "APO Hiking Society", tier: "opm" },
  { id: "4DnMIwv4TMh7HHSrkVyetj", title: "We Wish You A Merry Christmas", artist: "Viva All Star", tier: "opm" },
];
