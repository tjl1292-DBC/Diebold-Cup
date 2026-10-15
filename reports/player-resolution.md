# Player resolution report

Generated 2026-10-15T00:31:51.675Z from `Diebold_Cup_Results_1945-2025.xlsx` (sha256 ab3d3fa63a87).

## Summary

| | |
|---|---|
| name tokens | 2656 |
| players (per club) | 258 |
| method: exact_full_name | 1550 |
| method: initial_by_year | 4 |
| method: initial_single | 652 |
| method: new_identity | 45 |
| method: override | 79 |
| method: suffix_merge | 97 |
| method: surname_by_year | 33 |
| method: surname_single | 196 |
| confidence: high | 2522 |
| confidence: medium | 132 |
| confidence: low | 2 |

## Needs review (0)

Suffix-less names with more than one suffixed candidate. Pin each year with an alias rule in `data/overrides/players.yaml`.


## Low-confidence assignments (2)

The spelling matched more than one player and season proximity could not separate them. Sorted by year.

| Year | Session | Club | As written | Assigned to | Other candidates |
|---|---|---|---|---|---|
| 2003 | 2003-3 | oakmont | Wagner | Chick Wagner (oakmont-chick-wagner, 2000-2014, 27 rows) | Rob Wagner (oakmont-rob-wagner, 2000-2008, 10 rows); Corey Wagner (oakmont-corey-wagner, 2010-2014, 3 rows); K. Wagner (oakmont-k-wagner, 2008-2008, 1 rows) |
| 2003 | 2003-3 | oakmont | Wagner | Chick Wagner (oakmont-chick-wagner, 2000-2014, 27 rows) | Rob Wagner (oakmont-rob-wagner, 2000-2008, 10 rows); Corey Wagner (oakmont-corey-wagner, 2010-2014, 3 rows); K. Wagner (oakmont-k-wagner, 2008-2008, 1 rows) |

## Resolved by season proximity (35)

More than one candidate, but only one was active around that year. Spot-check a few.

| Year | Club | As written | Assigned to | Other candidates |
|---|---|---|---|---|
| 2000 | fox-chapel | Fownes | John Fownes (fox-chapel-john-fownes, 2000-2000, 2 rows) | Ben Fownes (fox-chapel-ben-fownes, 2018-2022, 3 rows) |
| 2007 | oakmont | C. Wagner | Chick Wagner (oakmont-chick-wagner, 2000-2014, 27 rows) | Corey Wagner (oakmont-corey-wagner, 2010-2014, 3 rows) |
| 2007 | oakmont | C. Wagner | Chick Wagner (oakmont-chick-wagner, 2000-2014, 27 rows) | Corey Wagner (oakmont-corey-wagner, 2010-2014, 3 rows) |
| 2007 | fox-chapel | Hellberg | Eric Hellberg (fox-chapel-eric-hellberg, 2007-2023, 10 rows) | Scott Hellberg (fox-chapel-scott-hellberg, 2017-2025, 16 rows) |
| 2007 | fox-chapel | Hellberg | Eric Hellberg (fox-chapel-eric-hellberg, 2007-2023, 10 rows) | Scott Hellberg (fox-chapel-scott-hellberg, 2017-2025, 16 rows) |
| 2007 | longue-vue | Troutman | Jeff Troutman (longue-vue-jeff-troutman, 2000-2016, 24 rows) | Scott Troutman (longue-vue-scott-troutman, 2010-2015, 5 rows); Charlie Troutman (longue-vue-charlie-troutman, 2020-2025, 6 rows) |
| 2008 | oakmont | C. Wagner | Chick Wagner (oakmont-chick-wagner, 2000-2014, 27 rows) | Corey Wagner (oakmont-corey-wagner, 2010-2014, 3 rows) |
| 2008 | longue-vue | Troutman | Jeff Troutman (longue-vue-jeff-troutman, 2000-2016, 24 rows) | Scott Troutman (longue-vue-scott-troutman, 2010-2015, 5 rows); Charlie Troutman (longue-vue-charlie-troutman, 2020-2025, 6 rows) |
| 2008 | fox-chapel | Hellberg | Eric Hellberg (fox-chapel-eric-hellberg, 2007-2023, 10 rows) | Scott Hellberg (fox-chapel-scott-hellberg, 2017-2025, 16 rows) |
| 2008 | longue-vue | Troutman | Jeff Troutman (longue-vue-jeff-troutman, 2000-2016, 24 rows) | Scott Troutman (longue-vue-scott-troutman, 2010-2015, 5 rows); Charlie Troutman (longue-vue-charlie-troutman, 2020-2025, 6 rows) |
| 2016 | field-club | Thomas | Jon Thomas (field-club-jon-thomas, 2000-2024, 73 rows) | B. Thomas (field-club-b-thomas, 2000-2000, 1 rows) |
| 2016 | fox-chapel | Delaney | Brice Delaney (fox-chapel-brice-delaney, 2016-2025, 13 rows) | O. Delaney (fox-chapel-o-delaney, 2023-2023, 1 rows) |
| 2016 | oakmont | Nettles | Chuck Nettles (oakmont-chuck-nettles, 2016-2025, 22 rows) | Tommy Nettles (oakmont-tommy-nettles, 2024-2025, 4 rows) |
| 2018 | fox-chapel | P. Walsh | Patrick Walsh (fox-chapel-patrick-walsh, 2018-2019, 3 rows) | Paul Walsh (fox-chapel-paul-walsh, 2010-2010, 2 rows) |
| 2018 | field-club | Thomas | Jon Thomas (field-club-jon-thomas, 2000-2024, 73 rows) | B. Thomas (field-club-b-thomas, 2000-2000, 1 rows) |
| 2018 | fox-chapel | Foster | Mike Foster (fox-chapel-mike-foster, 2000-2023, 41 rows) | K. Foster (fox-chapel-k-foster, 2012-2012, 1 rows) |
| 2018 | fox-chapel | Bitar | Scott Bitar II (fox-chapel-scott-bitar-ii, 2017-2025, 32 rows) | Barron Bitar (fox-chapel-barron-bitar, 2024-2025, 6 rows) |
| 2018 | fox-chapel | Walsh | Patrick Walsh (fox-chapel-patrick-walsh, 2018-2019, 3 rows) | Paul Walsh (fox-chapel-paul-walsh, 2010-2010, 2 rows); JP Walsh (fox-chapel-jp-walsh, 2024-2024, 1 rows) |
| 2018 | oakmont | Berglund | Rich Berglund (oakmont-rich-berglund, 2001-2024, 41 rows) | Todd Berglund (oakmont-todd-berglund, 2024-2025, 4 rows) |
| 2018 | oakmont | Mazeski | Paul Mazeski (oakmont-paul-mazeski, 2000-2021, 44 rows) | Robby Mazeski (oakmont-robby-mazeski, 2013-2016, 5 rows) |
| 2018 | oakmont | Nettles | Chuck Nettles (oakmont-chuck-nettles, 2016-2025, 22 rows) | Tommy Nettles (oakmont-tommy-nettles, 2024-2025, 4 rows) |
| 2019 | field-club | Thomas | Jon Thomas (field-club-jon-thomas, 2000-2024, 73 rows) | B. Thomas (field-club-b-thomas, 2000-2000, 1 rows) |
| 2019 | fox-chapel | Bitar | Scott Bitar II (fox-chapel-scott-bitar-ii, 2017-2025, 32 rows) | Barron Bitar (fox-chapel-barron-bitar, 2024-2025, 6 rows) |
| 2019 | fox-chapel | Delaney | Brice Delaney (fox-chapel-brice-delaney, 2016-2025, 13 rows) | O. Delaney (fox-chapel-o-delaney, 2023-2023, 1 rows) |
| 2019 | longue-vue | Betts | Will Betts (longue-vue-will-betts, 2008-2025, 39 rows) | M. Betts (longue-vue-m-betts, 2008-2008, 1 rows) |
| 2019 | longue-vue | Fisch | Matt Fisch (longue-vue-matt-fisch, 2014-2021, 8 rows) | F. Fisch (longue-vue-f-fisch, 2017-2017, 1 rows) |
| 2022 | fox-chapel | Fownes | Ben Fownes (fox-chapel-ben-fownes, 2018-2022, 3 rows) | John Fownes (fox-chapel-john-fownes, 2000-2000, 2 rows) |
| 2022 | oakmont | Nettles | Chuck Nettles (oakmont-chuck-nettles, 2016-2025, 22 rows) | Tommy Nettles (oakmont-tommy-nettles, 2024-2025, 4 rows) |
| 2022 | field-club | Wallisch | Andrew Wallisch (field-club-andrew-wallisch, 2007-2025, 35 rows) | J. Wallisch (field-club-j-wallisch, 2017-2017, 1 rows) |
| 2022 | fox-chapel | Bitar | Scott Bitar II (fox-chapel-scott-bitar-ii, 2017-2025, 32 rows) | Barron Bitar (fox-chapel-barron-bitar, 2024-2025, 6 rows) |
| 2022 | oakmont | Berglund | Rich Berglund (oakmont-rich-berglund, 2001-2024, 41 rows) | Todd Berglund (oakmont-todd-berglund, 2024-2025, 4 rows) |
| 2022 | longue-vue | Betts | Will Betts (longue-vue-will-betts, 2008-2025, 39 rows) | M. Betts (longue-vue-m-betts, 2008-2008, 1 rows) |
| 2023 | field-club | Wallisch | Andrew Wallisch (field-club-andrew-wallisch, 2007-2025, 35 rows) | J. Wallisch (field-club-j-wallisch, 2017-2017, 1 rows) |
| 2023 | field-club | O'Brien | Kevin O'Brien (field-club-kevin-obrien, 2023-2025, 12 rows) | Toby O'Brien (field-club-toby-obrien, 2001-2001, 1 rows) |
| 2025 | fox-chapel | Delaney | Brice Delaney (fox-chapel-brice-delaney, 2016-2025, 13 rows) | O. Delaney (fox-chapel-o-delaney, 2023-2023, 1 rows) |

## Suffix merges (10)

A name written without a suffix, merged into the only suffixed player of that name at the club.

- "Vance Smith" x35 → Vance Smith IV (fox-chapel-vance-smith-iv, 2000-2024, 52 rows)
- "John Birmingham" x14 → John Birmingham Jr. (oakmont-john-birmingham-jr, 2000-2017, 21 rows)
- "John Marous" x17 → John Marous III (field-club-john-marous-iii, 2003-2025, 24 rows)
- "Dave Lucas" x7 → Dave Lucas Jr. (fox-chapel-dave-lucas-jr, 2000-2018, 18 rows)
- "David Lucas" x2 → Dave Lucas Jr. (fox-chapel-dave-lucas-jr, 2000-2018, 18 rows)
- "JJ Bush" x9 → JJ Bush Jr. (longue-vue-jj-bush-jr, 2018-2025, 14 rows)
- "Scott Bitar" x5 → Scott Bitar II (fox-chapel-scott-bitar-ii, 2017-2025, 32 rows)
- "David Fuhrer" x1 → David Fuhrer II (fox-chapel-david-fuhrer-ii, 2021-2025, 13 rows)
- "Scotty Bitar" x6 → Scott Bitar II (fox-chapel-scott-bitar-ii, 2017-2025, 32 rows)
- "Davey Fuhrer" x1 → David Fuhrer II (fox-chapel-david-fuhrer-ii, 2021-2025, 13 rows)

## Players with no first name on any sheet (45)

- field-club: **Fisher** (field-club-fisher) 2008-2008, 1 rows — written as Fisher
- field-club: **R. Frohlich** (field-club-r-frohlich) 2025-2025, 1 rows — written as Frohlich
- field-club: **S. McInerney** (field-club-s-mcinerney) 2016-2016, 1 rows — written as McInerney
- field-club: **K. McKamish** (field-club-k-mckamish) 2023-2023, 1 rows — written as McKamish
- field-club: **McTighe** (field-club-mctighe) 2007-2007, 2 rows — written as McTighe
- field-club: **B. O'Mara Jr.** (field-club-b-omara-jr) 2007-2009, 9 rows — written as O'Mara
- field-club: **G. Thiele** (field-club-g-thiele) 2017-2017, 1 rows — written as Thiele
- field-club: **B. Thomas** (field-club-b-thomas) 2000-2000, 1 rows — written as Thomas
- field-club: **J. Wallisch** (field-club-j-wallisch) 2017-2017, 1 rows — written as Wallisch
- fox-chapel: **L. Astorino** (fox-chapel-l-astorino) 2017-2017, 1 rows — written as Astorino
- fox-chapel: **W. Barker** (fox-chapel-w-barker) 2018-2019, 2 rows — written as Barker
- fox-chapel: **O. Delaney** (fox-chapel-o-delaney) 2023-2023, 1 rows — written as Delaney
- fox-chapel: **K. Foster** (fox-chapel-k-foster) 2012-2012, 1 rows — written as Foster
- fox-chapel: **T. Heppenstall** (fox-chapel-t-heppenstall) 2000-2007, 6 rows — written as Heppenstall
- fox-chapel: **T. Kelly** (fox-chapel-t-kelly) 2017-2017, 1 rows — written as Kelly
- fox-chapel: **Kramer** (fox-chapel-kramer) 2008-2008, 3 rows — written as Kramer
- fox-chapel: **C. Rudolf** (fox-chapel-c-rudolf) 2017-2021, 3 rows — written as Rudolf
- fox-chapel: **R. Russell** (fox-chapel-r-russell) 2016-2020, 8 rows — written as Russell, Russel
- fox-chapel: **Schmitt** (fox-chapel-schmitt) 2001-2001, 1 rows — written as Schmitt
- fox-chapel: **D. Smith** (fox-chapel-d-smith) 2017-2017, 1 rows — written as Smith
- fox-chapel: **T. Sweeney** (fox-chapel-t-sweeney) 2000-2000, 1 rows — written as Sweeney
- fox-chapel: **Wolff** (fox-chapel-wolff) 2000-2000, 1 rows — written as Wolff
- longue-vue: **Benkart** (longue-vue-benkart) 2007-2007, 1 rows — written as Benkart
- longue-vue: **M. Betts** (longue-vue-m-betts) 2008-2008, 1 rows — written as Betts
- longue-vue: **W. Bloss** (longue-vue-w-bloss) 2009-2018, 2 rows — written as Bloss
- longue-vue: **J. Bulger** (longue-vue-j-bulger) 2003-2003, 1 rows — written as Bulger
- longue-vue: **P. Compeau** (longue-vue-p-compeau) 2018-2018, 1 rows — written as Compeau
- longue-vue: **D. DelBianco** (longue-vue-d-delbianco) 2000-2000, 1 rows — written as DelBianco
- longue-vue: **Duerr** (longue-vue-duerr) 2025-2025, 1 rows — written as Duerr
- longue-vue: **F. Fisch** (longue-vue-f-fisch) 2017-2017, 1 rows — written as Fisch
- longue-vue: **Folino** (longue-vue-folino) 2000-2000, 1 rows — written as Folino
- longue-vue: **S. O'Donnell** (longue-vue-s-odonnell) 2003-2003, 1 rows — written as O'Donnell
- longue-vue: **B. Sera** (longue-vue-b-sera) 2017-2022, 5 rows — written as Sera
- longue-vue: **D. Tuthill** (longue-vue-d-tuthill) 2007-2007, 1 rows — written as Tuthill
- longue-vue: **B. Weinbaum** (longue-vue-b-weinbaum) 2017-2017, 2 rows — written as Weinbaum
- oakmont: **B. Burke** (oakmont-b-burke) 2018-2018, 1 rows — written as Burke
- oakmont: **D. Donahue** (oakmont-d-donahue) 2020-2020, 1 rows — written as Donahue
- oakmont: **Fricke** (oakmont-fricke) 2025-2025, 1 rows — written as Fricke
- oakmont: **A. Hofmann** (oakmont-a-hofmann) 2007-2022, 7 rows — written as Hofmann
- oakmont: **B. Kittsley** (oakmont-b-kittsley) 2009-2020, 2 rows — written as Kittsley
- oakmont: **A. Lawson** (oakmont-a-lawson) 2017-2018, 2 rows — written as Lawson
- oakmont: **W. Livingston** (oakmont-w-livingston) 2021-2021, 1 rows — written as Livingston
- oakmont: **S. Thomas** (oakmont-s-thomas) 2017-2017, 1 rows — written as Thomas
- oakmont: **K. Wagner** (oakmont-k-wagner) 2008-2008, 1 rows — written as Wagner
- oakmont: **L. Wright** (oakmont-l-wright) 2001-2001, 1 rows — written as Wright

## Same name at more than one club (6)

Possibly the same person who changed clubs. Join them with a `people:` entry in players.yaml.

- Jim Bulger (fox-chapel-jim-bulger, 2007-2010, 12 rows) / Jim Bulger (oakmont-jim-bulger, 2014-2017, 4 rows)
- Joe O'Donnell (oakmont-joe-odonnell, 2007-2010, 6 rows) / Joe O'Donnell (longue-vue-joe-odonnell, 2001-2003, 4 rows)
- Paul Walsh (longue-vue-paul-walsh, 2000-2007, 4 rows) / Paul Walsh (fox-chapel-paul-walsh, 2010-2010, 2 rows)
- Rich Berglund (oakmont-rich-berglund, 2001-2024, 41 rows) / Rich Berglund (fox-chapel-rich-berglund, 2012-2012, 4 rows)
- Todd Berglund (fox-chapel-todd-berglund, 2012-2013, 2 rows) / Todd Berglund (oakmont-todd-berglund, 2024-2025, 4 rows)
- Tim Derdenger (longue-vue-tim-derdenger, 2015-2016, 4 rows) / Tim Derdenger (fox-chapel-tim-derdenger, 2025-2025, 3 rows)

## Near-duplicate surnames within a club (0)

One letter apart. Likely a transcription or handwriting variant; add an alias rule if so.


## Roster by club

### Pittsburgh Field Club (59)

| Player | id | Seasons | Rows | Written as |
|---|---|---|---|---|
| Ryan Banks | `field-club-banks` | 2025-2025 | 1 | Banks (1) |
| Pat Brady | `field-club-pat-brady` | 2000-2021 | 18 | Pat Brady (10), P. Brady (6), Brady (2) |
| Andy Butler | `field-club-andy-butler` | 2018-2021 | 16 | A. Butler (9), Andy Butler (5), Butler (2) |
| Denny Cestra | `field-club-denny-cestra` | 2013-2014 | 3 | D. Cestra (2), Denny Cestra (1) |
| Damon Claus | `field-club-damon-claus` | 2024-2024 | 1 | Damon Claus (1) |
| DJ Claus | `field-club-dj-claus` | 2017-2020 | 4 | DJ Claus (3), D.J. Claus (1) |
| Rick Collins | `field-club-rick-collins` | 2000-2007 | 13 | Rick Collins (13) |
| Paul Curry | `field-club-paul-curry` | 2000-2015 | 21 | Paul Curry (19), P. Curry (2) |
| Tim Dodson | `field-club-tim-dodson` | 2008-2023 | 16 | Tim Dodson (9), T. Dodson (6), Dodson (1) |
| Dan Donahue | `field-club-dan-donahue` | 2010-2010 | 3 | Dan Donahue (3) |
| Greg Donahue | `field-club-greg-donahue` | 2000-2003 | 7 | Greg Donahue (7) |
| Matt Dunlap | `field-club-dunlap` | 2025-2025 | 1 | Dunlap (1) |
| Jordan Dunsmore | `field-club-jordan-dunsmore` | 2016-2021 | 8 | J. Dunsmore (4), Jordan Dunsmore (3), Dunsmore (1) |
| Brendan Eisenbrandt | `field-club-brendan-eisenbrandt` | 2007-2014 | 6 | Brendan Eisenbrandt (4), B. Eisenbrandt (2) |
| Dom Fazio | `field-club-dom-fazio` | 2024-2025 | 4 | Dom Fazio (4) |
| Fisher | `field-club-fisher` | 2008-2008 | 1 | Fisher (1) |
| Graham Friday | `field-club-graham-friday` | 2018-2024 | 3 | G. Friday (1), Friday (1), Graham Friday (1) |
| R. Frohlich | `field-club-r-frohlich` | 2025-2025 | 1 | R. Frohlich (1) |
| Frank Fuhrer III | `field-club-frank-fuhrer-iii` | 2000-2025 | 11 | Frank Fuhrer (6), Frank Fuhrer III (3), F. Fuhrer III (2) |
| Frank Fuhrer IV | `field-club-frank-fuhrer-iv` | 2025-2025 | 1 | Frank Fuhrer IV (1) |
| Jas Fuhrer | `field-club-jas-fuhrer` | 2019-2025 | 20 | Jas Fuhrer (13), J. Fuhrer (6), Fuhrer (1) |
| John Ifft | `field-club-john-ifft` | 2003-2013 | 9 | Ifft (4), John Ifft (3), J. Ifft (2) |
| RP Jacob | `field-club-rp-jacob` | 2000-2001 | 2 | R.P. Jacob (2) |
| Greg Jacobs | `field-club-greg-jacobs` | 2013-2018 | 6 | G. Jacobs (4), Greg Jacobs (2) |
| Jack Katarincic | `field-club-jack-katarincic` | 2014-2023 | 28 | J. Katarincic (17), Jack Katarincic (7), Katarincic (4) |
| Tommy Leech | `field-club-tommy-leech` | 2010-2025 | 46 | Tommy Leech (19), T. Leech (17), Tom Leech (5), Leech (5) |
| Will Maher | `field-club-will-maher` | 2014-2015 | 2 | W. Maher (1), Will Maher (1) |
| John Marous III | `field-club-john-marous-iii` | 2003-2025 | 24 | John Marous (17), J. Marous (3), Marous (2), John Marous III (1), J. Marous III (1) |
| Matt Mattioli | `field-club-matt-mattioli` | 2020-2025 | 19 | Matt Mattioli (14), Mattioli (3), M. Mattioli (2) |
| S. McInerney | `field-club-s-mcinerney` | 2016-2016 | 1 | S. McInerney (1) |
| K. McKamish | `field-club-k-mckamish` | 2023-2023 | 1 | K. McKamish (1) |
| Will McMahon | `field-club-will-mcmahon` | 2015-2025 | 6 | Will McMahon (6) |
| McTighe | `field-club-mctighe` | 2007-2007 | 2 | McTighe (2) |
| Greg Meyer | `field-club-greg-meyer` | 2007-2010 | 16 | Greg Meyer (16) |
| Derek Mousseau | `field-club-derek-mousseau` | 2016-2025 | 21 | D. Mousseau (10), Derek Mousseau (7), Mousseau (4) |
| Kevin O'Brien | `field-club-kevin-obrien` | 2023-2025 | 12 | Kevin O'Brien (10), O'Brien (1), K. O'Brien (1) |
| Toby O'Brien | `field-club-toby-obrien` | 2001-2001 | 1 | Toby O'Brien (1) |
| B. O'Mara Jr. | `field-club-b-omara-jr` | 2007-2009 | 9 | O'Mara (3), B. O'Mara Jr. (3), B. O'Mara Sr. (2), O'Mara III (1) |
| Gordy Opitz | `field-club-gordy-opitz` | 2000-2020 | 25 | Gordy Opitz (20), G. Opitz (5) |
| Chip Pfendler | `field-club-chip-pfendler` | 2000-2003 | 7 | Chip Pfendler (7) |
| Mike Pitcairn | `field-club-mike-pitcairn` | 2000-2010 | 5 | Mike Pitcairn (5) |
| Ron Richards | `field-club-ron-richards` | 2021-2021 | 1 | Ron Richards (1) |
| JM Ruscetti | `field-club-jm-ruscetti` | 2001-2025 | 42 | J.M. Ruscetti (19), JM Ruscetti (15), J. Ruscetti (5), Ruscetti (3) |
| Dennis Sheedy | `field-club-dennis-sheedy` | 2000-2001 | 6 | Dennis Sheedy (6) |
| Matt Sheedy | `field-club-matt-sheedy` | 2001-2001 | 1 | Matt Sheedy (1) |
| Patrick Sherry | `field-club-patrick-sherry` | 2022-2025 | 7 | Patrick Sherry (5), Sherry (2) |
| Pat Smith | `field-club-pat-smith` | 2008-2024 | 24 | Pat Smith (12), P. Smith (5), Patrick Smith (4), Smith (3) |
| Walt Stoecklein | `field-club-walt-stoecklein` | 2010-2010 | 1 | Walt Stoecklein (1) |
| G. Thiele | `field-club-g-thiele` | 2017-2017 | 1 | G. Thiele (1) |
| B. Thomas | `field-club-b-thomas` | 2000-2000 | 1 | B. Thomas (1) |
| Jon Thomas | `field-club-jon-thomas` | 2000-2024 | 73 | Jon Thomas (45), J. Thomas (21), Thomas (3), Jonathan Thomas (3), John Thomas (1) |
| Mark Veenis | `field-club-mark-veenis` | 2000-2012 | 13 | Mark Veenis (11), Veenis (2) |
| Tucker Veenis | `field-club-tucker-veenis` | 2003-2017 | 11 | Tucker Veenis (7), T. Veenis (4) |
| J. Wallisch | `field-club-j-wallisch` | 2017-2017 | 1 | J. Wallisch (1) |
| Andrew Wallisch | `field-club-andrew-wallisch` | 2007-2025 | 35 | Andrew Wallisch (24), A. Wallisch (9), Wallisch (2) |
| Wes Warden | `field-club-wes-warden` | 2020-2023 | 7 | Warden (3), W. Warden (2), Wes Warden (2) |
| Dave Weber | `field-club-dave-weber` | 2009-2023 | 30 | Dave Weber (16), D. Weber (12), Weber (2) |
| Tom Welsh | `field-club-tom-welsh` | 2000-2008 | 5 | Tom Welsh (4), Welsh (1) |
| Chip Zimmerman | `field-club-chip-zimmerman` | 2003-2003 | 4 | Chip Zimmerman (4) |

### Fox Chapel Golf Club (73)

| Player | id | Seasons | Rows | Written as |
|---|---|---|---|---|
| L. Astorino | `fox-chapel-l-astorino` | 2017-2017 | 1 | L. Astorino (1) |
| W. Barker | `fox-chapel-w-barker` | 2018-2019 | 2 | W. Barker (2) |
| Phil Beard | `fox-chapel-phil-beard` | 2001-2014 | 4 | Phil Beard (3), P. Beard (1) |
| Andrew Begg | `fox-chapel-andrew-begg` | 2013-2015 | 9 | Andrew Begg (6), A. Begg (3) |
| Stephen Begg | `fox-chapel-stephen-begg` | 2000-2012 | 19 | Stephen Begg (19) |
| Rich Berglund | `fox-chapel-rich-berglund` | 2012-2012 | 4 | Rich Berglund (4) |
| Todd Berglund | `fox-chapel-todd-berglund` | 2012-2013 | 2 | T. Berglund (1), Todd Berglund (1) |
| Barron Bitar | `fox-chapel-barron-bitar` | 2024-2025 | 6 | Barron Bitar (6) |
| Scott Bitar II | `fox-chapel-scott-bitar-ii` | 2017-2025 | 32 | S. Bitar (13), Scotty Bitar (6), Scott Bitar (5), Bitar (4), Scott Bitar II (4) |
| James Braham | `fox-chapel-james-braham` | 2015-2015 | 1 | James Braham (1) |
| Jim Bulger | `fox-chapel-jim-bulger` | 2007-2010 | 12 | Jim Bulger (12) |
| Aidan Burchianti | `fox-chapel-aidan-burchianti` | 2022-2024 | 2 | Burchianti (1), Aidan Burchianti (1) |
| Mike Carlin | `fox-chapel-mike-carlin` | 2012-2023 | 24 | M. Carlin (13), Mike Carlin (7), Carlin (3), Michael Carlin (1) |
| Dan Casey | `fox-chapel-dan-casey` | 2003-2003 | 1 | Dan Casey (1) |
| TJ Cleveland | `fox-chapel-tj-cleveland` | 2019-2019 | 1 | TJ Cleveland (1) |
| Jesse Coslov | `fox-chapel-jesse-coslov` | 2021-2021 | 1 | Jesse Coslov (1) |
| Paul Davidson | `fox-chapel-paul-davidson` | 2001-2001 | 2 | Paul Davidson (2) |
| O. Delaney | `fox-chapel-o-delaney` | 2023-2023 | 1 | O. Delaney (1) |
| Brice Delaney | `fox-chapel-brice-delaney` | 2016-2025 | 13 | B. Delaney (7), Delaney (3), Brice Delaney (2), Bryce Delaney (1) |
| Tim Derdenger | `fox-chapel-tim-derdenger` | 2025-2025 | 3 | Tim Derdenger (3) |
| David Dick | `fox-chapel-david-dick` | 2007-2007 | 2 | Dick (1), David Dick (1) |
| Bob Egan | `fox-chapel-bob-egan` | 2001-2001 | 1 | Bob Egan (1) |
| Rob Ellsworth | `fox-chapel-rob-ellsworth` | 2024-2025 | 3 | Rob Ellsworth (3) |
| K. Foster | `fox-chapel-k-foster` | 2012-2012 | 1 | K. Foster (1) |
| Mike Foster | `fox-chapel-mike-foster` | 2000-2023 | 41 | Mike Foster (32), M. Foster (7), Michael Foster (1), Foster (1) |
| Ben Fownes | `fox-chapel-ben-fownes` | 2018-2022 | 3 | B. Fownes (1), Fownes (1), Ben Fownes (1) |
| John Fownes | `fox-chapel-john-fownes` | 2000-2000 | 2 | Fownes (1), John Fownes (1) |
| Rob Franklin | `fox-chapel-rob-franklin` | 2013-2024 | 6 | Rob Franklin (4), R. Franklin (1), Robert Franklin (1) |
| David Fuhrer II | `fox-chapel-david-fuhrer-ii` | 2021-2025 | 13 | David Fuhrer II (6), D. Fuhrer II (2), David Fuhrer (1), Dave Fuhrer II (1), Fuhrer II (1), D. Fuhrer (1), Davey Fuhrer (1) |
| Patrick Gallagher | `fox-chapel-patrick-gallagher` | 2007-2008 | 5 | Gallagher (4), Patrick Gallagher (1) |
| Todd Green | `fox-chapel-todd-green` | 2020-2024 | 8 | Todd Green (4), T. Green (3), Green (1) |
| Clint Guyaux | `fox-chapel-clint-guyaux` | 2017-2022 | 7 | C. Guyaux (3), Guyaux (2), Clint Guyaux (2) |
| Jon Halpern | `fox-chapel-jon-halpern` | 2022-2024 | 4 | Jon Halpern (3), Halpern (1) |
| Eric Hellberg | `fox-chapel-eric-hellberg` | 2007-2023 | 10 | Eric Hellberg (5), Hellberg (3), E. Hellberg (2) |
| Scott Hellberg | `fox-chapel-scott-hellberg` | 2017-2025 | 16 | Scott Hellberg (9), S. Hellberg (6), Hellberg (1) |
| T. Heppenstall | `fox-chapel-t-heppenstall` | 2000-2007 | 6 | Heppenstall (3), T. Heppenstall (3) |
| Adam Hofmann | `fox-chapel-adam-hofmann` | 2008-2025 | 30 | Adam Hofmann (22), A. Hofmann (6), Hofmann (2) |
| Rick Humphrey | `fox-chapel-rick-humphrey` | 2000-2012 | 11 | Rick Humphrey (11) |
| Dave Kassling | `fox-chapel-dave-kassling` | 2008-2022 | 6 | Kassling (3), Dave Kassling (2), D. Kassling (1) |
| T. Kelly | `fox-chapel-t-kelly` | 2017-2017 | 1 | T. Kelly (1) |
| John Klee | `fox-chapel-john-klee` | 2001-2001 | 2 | John Klee (2) |
| Kramer | `fox-chapel-kramer` | 2008-2008 | 3 | Kramer (3) |
| Adam Lauer | `fox-chapel-adam-lauer` | 2018-2023 | 19 | A. Lauer (7), Adam Lauer (7), Lauer (5) |
| Dave Lucas Jr. | `fox-chapel-dave-lucas-jr` | 2000-2018 | 18 | Dave Lucas (7), D. Lucas (5), David Lucas (2), Dave Lucas Jr (2), Lucas Jr (1), D. Lucas Jr. (1) |
| John Mah | `fox-chapel-john-mah` | 2014-2023 | 17 | John Mah (7), J. Mah (7), Mah (3) |
| Randy McCombs | `fox-chapel-randy-mccombs` | 2003-2019 | 25 | Randy McCombs (18), R. McCombs (5), McCombs (2) |
| Henry McCrady | `fox-chapel-henry-mccrady` | 2023-2025 | 4 | Henry McCrady (4) |
| Dave Mengel | `fox-chapel-dave-mengel` | 2001-2016 | 12 | Dave Mengel (9), David Mengel (1), Mengel (1), D. Mengel (1) |
| Jeremy Merich | `fox-chapel-jeremy-merich` | 2020-2023 | 8 | Jeremy Merich (4), J. Merich (3), Merich (1) |
| Sam Miclot | `fox-chapel-sam-miclot` | 2024-2024 | 1 | Sam Miclot (1) |
| Matt Moore | `fox-chapel-matt-moore` | 2010-2012 | 6 | Matt Moore (5), Matthew Moore (1) |
| Drew Morrison | `fox-chapel-drew-morrison` | 2001-2001 | 2 | Drew Morrison (2) |
| Greg Podufal | `fox-chapel-greg-podufal` | 2016-2021 | 18 | G. Podufal (13), Podufal (3), Greg Podufal (2) |
| Tom Reading | `fox-chapel-tom-reading` | 2008-2014 | 5 | Tom Reading (5) |
| C. Rudolf | `fox-chapel-c-rudolf` | 2017-2021 | 3 | C. Rudolf (3) |
| R. Russell | `fox-chapel-r-russell` | 2016-2020 | 8 | R. Russell (6), R. Russel (1), Russell (1) |
| Schmitt | `fox-chapel-schmitt` | 2001-2001 | 1 | Schmitt (1) |
| Gus Schroeder | `fox-chapel-gus-schroeder` | 2007-2021 | 22 | Gus Schroeder (12), G. Schroeder (9), Schroeder (1) |
| D. Smith | `fox-chapel-d-smith` | 2017-2017 | 1 | D. Smith (1) |
| Ben Smith | `fox-chapel-ben-smith` | 2000-2013 | 24 | Ben Smith (24) |
| Bennett Smith | `fox-chapel-bennett-smith` | 2003-2025 | 38 | B. Smith (19), Bennett Smith (18), Smith (1) |
| Vance Smith IV | `fox-chapel-vance-smith-iv` | 2000-2024 | 52 | Vance Smith (35), V. Smith (15), Smith (1), Vance Smith IV (1) |
| Hunter Stanchak | `fox-chapel-hunter-stanchak` | 2022-2025 | 7 | Hunter Stanchak (4), Stanchak (3) |
| T. Sweeney | `fox-chapel-t-sweeney` | 2000-2000 | 1 | T. Sweeney (1) |
| Don Thomas | `fox-chapel-don-thomas` | 2024-2025 | 6 | Don Thomas (6) |
| Spencer Todd | `fox-chapel-spencer-todd` | 2001-2007 | 2 | Spencer Todd (2) |
| Jim Usher | `fox-chapel-jim-usher` | 2010-2015 | 8 | Jim Usher (7), J. Usher (1) |
| JP Walsh | `fox-chapel-jp-walsh` | 2024-2024 | 1 | JP Walsh (1) |
| Patrick Walsh | `fox-chapel-patrick-walsh` | 2018-2019 | 3 | Walsh (1), P. Walsh (1), Patrick Walsh (1) |
| Paul Walsh | `fox-chapel-paul-walsh` | 2010-2010 | 2 | Paul Walsh (2) |
| Ben Washburn | `fox-chapel-ben-washburn` | 2023-2024 | 2 | B. Washburn (1), Ben Washburn (1) |
| Henry Watson | `fox-chapel-henry-watson` | 2000-2017 | 26 | Henry Watson (21), H. Watson (5) |
| Wolff | `fox-chapel-wolff` | 2000-2000 | 1 | Wolff (1) |

### Oakmont Country Club (64)

| Player | id | Seasons | Rows | Written as |
|---|---|---|---|---|
| Amby Bauer | `oakmont-amby-bauer` | 2012-2014 | 3 | Amby Bauer (2), A. Bauer (1) |
| Rich Berglund | `oakmont-rich-berglund` | 2001-2024 | 41 | Rich Berglund (25), R. Berglund (12), R. Bergland (2), Berglund (2) |
| Todd Berglund | `oakmont-todd-berglund` | 2024-2025 | 4 | Todd Berglund (3), Berglund (1) |
| Brett Bergman | `oakmont-brett-bergman` | 2007-2023 | 22 | Brett Bergman (17), B. Bergman (3), Bergman (2) |
| Brock Bergman | `oakmont-brock-bergman` | 2007-2014 | 7 | Brock Bergman (7) |
| John Birmingham Jr. | `oakmont-john-birmingham-jr` | 2000-2017 | 21 | John Birmingham (14), John Birmingham Jr (4), J. Birmingham (2), Birmingham (1) |
| Mark Bope | `oakmont-mark-bope` | 2000-2013 | 11 | Mark Bope (11) |
| John Bryan Jr. | `oakmont-john-bryan-jr` | 2001-2001 | 1 | John Bryan Jr (1) |
| John Bryan III | `oakmont-john-bryan-iii` | 2000-2000 | 1 | John Bryan III (1) |
| Jim Bulger | `oakmont-jim-bulger` | 2014-2017 | 4 | Jim Bulger (2), J. Bulger (2) |
| Luke Bumgardner | `oakmont-luke-bumgardner` | 2021-2023 | 4 | Luke Bumgardner (4) |
| B. Burke | `oakmont-b-burke` | 2018-2018 | 1 | B. Burke (1) |
| Ryan Cameron | `oakmont-ryan-cameron` | 2023-2024 | 2 | Cameron (1), Ryan Cameron (1) |
| Curt Coulter | `oakmont-curt-coulter` | 2000-2019 | 12 | Curt Coulter (12) |
| Tom Delaney | `oakmont-tom-delaney` | 2008-2016 | 6 | Delaney (2), Tom Delaney (2), T. Delaney (2) |
| Robbie Denove | `oakmont-robbie-denove` | 2017-2025 | 16 | R. Denove (8), Robbie Denove (5), Denove (3) |
| D. Donahue | `oakmont-d-donahue` | 2020-2020 | 1 | D. Donahue (1) |
| Ned Foster | `oakmont-ned-foster` | 2000-2016 | 16 | Ned Foster (11), N. Foster (3), Foster (2) |
| Fricke | `oakmont-fricke` | 2025-2025 | 1 | Fricke (1) |
| Andrew Friend | `oakmont-andrew-friend` | 2017-2025 | 21 | Andrew Friend (13), A. Friend (7), Friend (1) |
| Steve Fuhrer | `oakmont-steve-fuhrer` | 2013-2013 | 1 | Steve Fuhrer (1) |
| Chuck Gerba | `oakmont-chuck-gerba` | 2007-2007 | 2 | Chuck Gerba (2) |
| Bob Gwynne | `oakmont-bob-gwynne` | 2008-2008 | 2 | Bob Gwynne (2) |
| Keenan Hickton | `oakmont-keenan-hickton` | 2013-2015 | 3 | Keenan Hickton (2), K. Hickton (1) |
| A. Hofmann | `oakmont-a-hofmann` | 2007-2022 | 7 | A. Hofmann (4), Hofmann (3) |
| Art Kania | `oakmont-art-kania` | 2010-2010 | 1 | Art Kania (1) |
| Duke Kingsley | `oakmont-duke-kingsley` | 2000-2008 | 3 | Kingsley (1), Duke Kinsley (1), D. Kingsley (1) |
| B. Kittsley | `oakmont-b-kittsley` | 2009-2020 | 2 | B. Kittsley (2) |
| Ray Kohl | `oakmont-ray-kohl` | 2000-2000 | 1 | Ray Kohl (1) |
| Scott Lamond | `oakmont-scott-lamond` | 2008-2015 | 10 | Scott Lamond (7), S. Lamond (3) |
| A. Lawson | `oakmont-a-lawson` | 2017-2018 | 2 | A. Lawson (2) |
| Steve Leone | `oakmont-steve-leone` | 2003-2024 | 31 | Steve Leone (16), S. Leone (12), Leone (3) |
| W. Livingston | `oakmont-w-livingston` | 2021-2021 | 1 | W. Livingston (1) |
| Paul Mazeski | `oakmont-paul-mazeski` | 2000-2021 | 44 | Paul Mazeski (30), P. Mazeski (12), Mazeski (2) |
| Robby Mazeski | `oakmont-robby-mazeski` | 2013-2016 | 5 | Robby Mazeski (3), R. Mazeski (2) |
| Grant Mellon | `oakmont-grant-mellon` | 2000-2001 | 4 | Grant Mellon (4) |
| Spencer Mellon | `oakmont-spencer-mellon` | 2009-2015 | 14 | Spencer Mellon (10), S. Mellon (4) |
| Mitch Mercer | `oakmont-mitch-mercer` | 2020-2025 | 11 | Mitch Mercer (8), M. Mercer (2), Mercer (1) |
| Jimmy Meyers | `oakmont-jimmy-meyers` | 2017-2024 | 24 | Jimmy Meyers (11), J. Meyers (10), Meyers (3) |
| Justin Miller | `oakmont-justin-miller` | 2010-2024 | 29 | Justin Miller (16), J. Miller (10), Miller (3) |
| Chuck Nettles | `oakmont-chuck-nettles` | 2016-2025 | 22 | C. Nettles (10), Chuck Nettles (8), Nettles (4) |
| Tommy Nettles | `oakmont-tommy-nettles` | 2024-2025 | 4 | Tommy Nettles (2), Tom Nettles (1), T. Nettles (1) |
| Joe O'Donnell | `oakmont-joe-odonnell` | 2007-2010 | 6 | Joe O'Donnell (6) |
| Nathan Piatt | `oakmont-nathan-piatt` | 2022-2025 | 9 | Nathan Piatt (6), Piatt (2), N. Piatt (1) |
| Carter Pitcairn | `oakmont-carter-pitcairn` | 2021-2025 | 6 | Carter Pitcairn (4), C. Pitcairn (1), Pitcairn (1) |
| Rocco Salvitti | `oakmont-rocco-salvitti` | 2022-2025 | 12 | Rocco Salvitti (9), Salvitti (2), R. Salvitti (1) |
| Nolan Shilling | `oakmont-nolan-shilling` | 2025-2025 | 1 | Nolan Shilling (1) |
| Marty Slovonic | `oakmont-marty-slovonic` | 2009-2017 | 7 | Marty Slovonic (5), M. Slovonic (2) |
| Win Smathers | `oakmont-win-smathers` | 2013-2013 | 1 | Win Smathers (1) |
| Malcolm Spatz | `oakmont-malcolm-spatz` | 2000-2025 | 53 | Malcolm Spatz (29), M. Spatz (14), Spatz (6), Malcom Spatz (4) |
| Dave Stanchak | `oakmont-dave-stanchak` | 2008-2010 | 5 | Dave Stanchak (5) |
| Jim Sullivan Jr. | `oakmont-jim-sullivan-jr` | 2000-2020 | 45 | Jim Sullivan Jr (16), Jim Sullivan (13), J. Sullivan (9), J. Sullivan Jr. (4), Sullivan (2), Sullivan Jr. (1) |
| Jim Sullivan Sr. | `oakmont-jim-sullivan-sr` | 2000-2000 | 1 | Jim Sullivan Sr (1) |
| Tom Summers | `oakmont-tom-summers` | 2018-2025 | 11 | T. Summers (6), Tom Summers (3), Summers (2) |
| Nathan Sutherland | `oakmont-nathan-sutherland` | 2000-2025 | 33 | Nathan Sutherland (18), N. Sutherland (10), Sutherland (5) |
| S. Thomas | `oakmont-s-thomas` | 2017-2017 | 1 | S. Thomas (1) |
| Arne Thomas | `oakmont-arne-thomas` | 2015-2017 | 3 | Arne Thomas (1), Thomas (1), A. Thomas (1) |
| K. Wagner | `oakmont-k-wagner` | 2008-2008 | 1 | K. Wagner (1) |
| Chick Wagner | `oakmont-chick-wagner` | 2000-2014 | 27 | Chick Wagner (19), Wagner (4), C. Wagner (3), Chaz Wagner (1) |
| Corey Wagner | `oakmont-corey-wagner` | 2010-2014 | 3 | Corey Wagner (2), Cory Wagner (1) |
| Rob Wagner | `oakmont-rob-wagner` | 2000-2008 | 10 | Rob Wagner (10) |
| Chad Warmbein | `oakmont-chad-warmbein` | 2023-2025 | 8 | Chad Warmbein (7), C. Warmbein (1) |
| George Wolfe | `oakmont-george-wolfe` | 2003-2003 | 2 | George Wolfe (2) |
| L. Wright | `oakmont-l-wright` | 2001-2001 | 1 | L. Wright (1) |

### Longue Vue Club (62)

| Player | id | Seasons | Rows | Written as |
|---|---|---|---|---|
| Al Beeken | `longue-vue-al-beeken` | 2000-2013 | 14 | Beeken (7), Al Beeken (7) |
| Benkart | `longue-vue-benkart` | 2007-2007 | 1 | Benkart (1) |
| Joe Bertucci | `longue-vue-joe-bertucci` | 2008-2013 | 16 | Joe Bertucci (15), J. Bertucci (1) |
| M. Betts | `longue-vue-m-betts` | 2008-2008 | 1 | M. Betts (1) |
| Will Betts | `longue-vue-will-betts` | 2008-2025 | 39 | Will Betts (26), W. Betts (11), Betts (2) |
| W. Bloss | `longue-vue-w-bloss` | 2009-2018 | 2 | Bloss (1), W. Bloss (1) |
| J. Bulger | `longue-vue-j-bulger` | 2003-2003 | 1 | J. Bulger (1) |
| JJ Bush Jr. | `longue-vue-jj-bush-jr` | 2018-2025 | 14 | JJ Bush (9), J. Bush (3), JJ Bush Jr (1), Bush (1) |
| Doug Chambers | `longue-vue-doug-chambers` | 2000-2003 | 5 | Doug Chambers (5) |
| Mike Colville | `longue-vue-mike-colville` | 2000-2019 | 35 | Mike Colville (27), M. Colville (7), Colville (1) |
| P. Compeau | `longue-vue-p-compeau` | 2018-2018 | 1 | P. Compeau (1) |
| Anthony Cordaro | `longue-vue-anthony-cordaro` | 2013-2018 | 16 | A. Cordaro (12), Anthony Cordaro (3), Cordaro (1) |
| Joe Cordaro | `longue-vue-joe-cordaro` | 2007-2016 | 17 | Joe Cordaro (11), J. Cordaro (6) |
| Jim Crawford | `longue-vue-jim-crawford` | 2007-2018 | 13 | Jim Crawford (9), J. Crawford (4) |
| Amani D'Ambrosio | `longue-vue-amani-dambrosio` | 2024-2025 | 8 | Amani D'Ambrosio (8) |
| D. DelBianco | `longue-vue-d-delbianco` | 2000-2000 | 1 | D. DelBianco (1) |
| Tim Derdenger | `longue-vue-tim-derdenger` | 2015-2016 | 4 | Tim Derdenger (2), Derdenger (1), T. Derdenger (1) |
| Duerr | `longue-vue-duerr` | 2025-2025 | 1 | Duerr (1) |
| Ken Dyer | `longue-vue-ken-dyer` | 2003-2009 | 7 | Dyer (4), Ken Dyer (3) |
| Jim Eisengart | `longue-vue-jim-eisengart` | 2000-2009 | 8 | Jim Eisengart (8) |
| Derek Evans | `longue-vue-derek-evans` | 2021-2025 | 7 | Derek Evans (4), Evans (2), D. Evans (1) |
| F. Fisch | `longue-vue-f-fisch` | 2017-2017 | 1 | F. Fisch (1) |
| Matt Fisch | `longue-vue-matt-fisch` | 2014-2021 | 8 | M. Fisch (5), Fisch (2), Matt Fisch (1) |
| Folino | `longue-vue-folino` | 2000-2000 | 1 | Folino (1) |
| Mike Gielarowski | `longue-vue-mike-gielarowski` | 2021-2025 | 16 | Mike Gielarowski (12), Gielarowski (3), M. Gielarowski (1) |
| Nick Gordon | `longue-vue-nick-gordon` | 2019-2024 | 8 | Nick Gordon (4), N. Gordon (2), Gordon (2) |
| Brendan Gramley | `longue-vue-brendan-gramley` | 2014-2015 | 5 | Brendan Gramley (4), B. Gramley (1) |
| Tanner Grzegorczyk | `longue-vue-tanner-grzegorczyk` | 2022-2023 | 7 | Grzegorczyk (3), Tanner Grzegorczyk (3), T. Grzegorczyk (1) |
| Bruce Haney | `longue-vue-bruce-haney` | 2000-2008 | 4 | Haney (2), B. Haney (1), Bruce Haney (1) |
| Kevin Heher | `longue-vue-kevin-heher` | 2012-2023 | 30 | K. Heher (18), Kevin Heher (9), Heher (3) |
| Andrew Hodge | `longue-vue-andrew-hodge` | 2015-2025 | 41 | Andrew Hodge (18), A. Hodge (17), Hodge (6) |
| Brad Kelly | `longue-vue-brad-kelly` | 2000-2010 | 12 | Brad Kelly (6), Kelly (4), B. Kelly (2) |
| Sean Knapp | `longue-vue-sean-knapp` | 2000-2008 | 18 | Sean Knapp (18) |
| Kevin Koerbel | `longue-vue-kevin-koerbel` | 2021-2025 | 16 | Kevin Koerbel (12), K. Koerbel (2), Koerbel (2) |
| David Koi | `longue-vue-david-koi` | 2015-2015 | 1 | David Koi (1) |
| Justin Kreps | `longue-vue-justin-kreps` | 2012-2012 | 4 | Justin Kreps (4) |
| Stu Lotz | `longue-vue-stu-lotz` | 2015-2015 | 1 | Stu Lotz (1) |
| Mike McAdams | `longue-vue-mike-mcadams` | 2000-2003 | 7 | M. McAdams (4), Mike McAdams (2), Michael McAdams (1) |
| Jim McBride | `longue-vue-jim-mcbride` | 2007-2020 | 25 | J. McBride (12), Jim McBride (9), McBride (3), James McBride (1) |
| Brad McKean | `longue-vue-brad-mckean` | 2000-2003 | 3 | B. McKean (2), Brad McKean (1) |
| Chip Nelson | `longue-vue-chip-nelson` | 2000-2003 | 3 | Chip Nelson (3) |
| S. O'Donnell | `longue-vue-s-odonnell` | 2003-2003 | 1 | S. O'Donnell (1) |
| Joe O'Donnell | `longue-vue-joe-odonnell` | 2001-2003 | 4 | Joe O'Donnell (4) |
| Aidan Oehrle | `longue-vue-aidan-oehrle` | 2019-2025 | 24 | Aidan Oehrle (12), A. Oehrle (7), Oehrle (3), Aiden Oehrle (2) |
| Chris Osborne | `longue-vue-chris-osborne` | 2016-2020 | 12 | C. Osborne (8), Osborne (3), Chris Osborne (1) |
| Jonathan Pepe | `longue-vue-jonathan-pepe` | 2009-2013 | 14 | Jonathan Pepe (12), Jonathon Pepe (1), J. Pepe (1) |
| Joe Queri | `longue-vue-joe-queri` | 2000-2000 | 2 | Joe Queri (2) |
| Ben Rathfon | `longue-vue-ben-rathfon` | 2009-2014 | 15 | Ben Rathfon (11), B. Rathfon (4) |
| Evan Ruhling | `longue-vue-evan-ruhling` | 2016-2025 | 37 | E. Ruhling (16), Evan Ruhling (16), Ruhling (5) |
| Jeff Schroeder | `longue-vue-jeff-schroeder` | 2000-2003 | 11 | Jeff Schroeder (11) |
| B. Sera | `longue-vue-b-sera` | 2017-2022 | 5 | B. Sera (4), Sera (1) |
| Matt Simone | `longue-vue-matt-simone` | 2009-2012 | 8 | Matt Simone (8) |
| Charlie Troutman | `longue-vue-charlie-troutman` | 2020-2025 | 6 | Charlie Troutman (4), C. Troutman (2) |
| Jeff Troutman | `longue-vue-jeff-troutman` | 2000-2016 | 24 | Jeff Troutman (16), Troutman (4), J. Troutman (4) |
| Scott Troutman | `longue-vue-scott-troutman` | 2010-2015 | 5 | Scott Troutman (3), S. Troutman (2) |
| D. Tuthill | `longue-vue-d-tuthill` | 2007-2007 | 1 | D. Tuthill (1) |
| Mark Vernallis | `longue-vue-mark-vernallis` | 2015-2020 | 12 | M. Vernallis (7), Mark Vernallis (3), Merk Vernallis (1), Vernallis (1) |
| Paul Walsh | `longue-vue-paul-walsh` | 2000-2007 | 4 | Paul Walsh (4) |
| B. Weinbaum | `longue-vue-b-weinbaum` | 2017-2017 | 2 | B. Weinbaum (2) |
| Shawn Will | `longue-vue-shawn-will` | 2001-2021 | 45 | Shawn Will (27), S. Will (14), Will (2), Sean Will (2) |
| Jack Wymard | `longue-vue-jack-wymard` | 2023-2025 | 7 | Jack Wymard (7) |
| Eli Yofan | `longue-vue-eli-yofan` | 2025-2025 | 3 | Eli Yofan (3) |
