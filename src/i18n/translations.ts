/**
 * Every user-facing string in the app, in English and Sinhala, keyed by a
 * stable id. Both static UI copy and the game engine's dynamic messages
 * (see game/engine.ts's `EngineMessage`) live in the same dictionary so
 * there is exactly one place to add a language.
 *
 * `{param}` placeholders are filled in by `interpolate` (see format.ts).
 */
export type Language = 'en' | 'si';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'si', label: 'සිංහල' },
];

export type Dictionary = Record<string, string>;

export const TRANSLATIONS: Record<Language, Dictionary> = {
  en: {
    // Home screen
    'home.welcomeBack': 'Welcome back, {name}!',
    'home.welcome': 'Welcome!',
    'home.tagline': '304 — the classic South Indian trick-taking card game.',
    'home.namePlaceholder': 'Your name',
    'home.newGame': 'New Game',
    'home.resumeGame': 'Resume Game',
    'home.howToPlay': 'How to Play',

    // Game modes
    'mode.classic.label': 'Classic',
    'mode.classic.description': 'Trump stays hidden until a player void in the led suit asks for it.',
    'mode.blind.label': 'Blind',
    'mode.blind.description':
      'Played with a stripped 24-card deck (no 7s or 8s) — 6 cards a hand, dealt 3 at a time. Nobody may request the trump reveal. Anyone void in the led suit must play a card face-down — it reveals the trump if it matches, or stays hidden forever if it doesn’t. The bidder alone may instead submit the sequestered trump card itself as a deliberate reveal. Either way, a reveal is only announced once the trick it happened in ends.',
    'mode.open.label': 'Open',
    'mode.open.description': 'Trump is revealed to everyone the moment the bidder sets it.',

    // How to play modal
    'htp.title': 'How to Play',
    'htp.step1': 'First deal — everyone receives 4 cards.',
    'htp.step2':
      'Bidding — starting left of the dealer, players bid (minimum 200, raises in steps of 10, maximum 304) or pass. A pass is final. The highest bidder wins the right to set the trump. If all four players pass, the hand is redealt.',
    'htp.step3': 'Trump selection — the bidder places one card from their hand face down; its suit is the secret trump.',
    'htp.step4': 'Second deal — 4 more cards each (the bidder plays one card short until the trump is revealed).',
    'htp.step5':
      'Trick play — the player left of the dealer leads. You must follow the led suit if you can. If you cannot, you may click Reveal Trump to flip the hidden card; from then on the trump suit beats everything.',
    'htp.step6': 'Scoring — the bidding team must capture card points ≥ their bid.',
    'htp.cardRanking':
      'Card ranking (high → low): J, 9, A, 10, K, Q, 8, 7 — worth 30, 20, 11, 10, 3, 2, 0, 0 points. 4 suits × 76 points = 304 total points in play.',
    'htp.houseRulesTitle': 'House rules used by this implementation:',
    'htp.rule1': 'Trumping is allowed but never forced when void in the led suit.',
    'htp.rule2': 'The trump applies to the entire trick in which it is revealed.',
    'htp.rule3': "On reveal, the concealed card returns to the bidder's hand.",
    'htp.rule4':
      'If nobody asks for the reveal, the trump flips automatically when the bidder must play their final (concealed) card, so all 304 points are always distributed.',
    'htp.rule5': 'If all four players pass the auction, the same dealer redeals.',
    'htp.gotIt': 'Got it',

    // Confirm new game modal
    'confirm.title': 'Start a new game?',
    'confirm.body': 'You have a game in progress. Starting a new game will discard it.',
    'confirm.discard': 'Discard & start new game',
    'confirm.cancel': 'Cancel',

    // Trump select modal
    'trumpSelect.title': 'You won the bid at {bid}!',
    'trumpSelect.body': 'Choose a card to place face down — its suit becomes the secret trump.',

    // Bidding modal
    'bid.title': 'Your bid',
    'bid.opensAt': 'Bidding opens at {min}.',
    'bid.holdsAt': '{name} holds the bid at {bid}.',
    'bid.pass': 'Pass',

    // Table
    'table.revealTrump': 'Reveal Trump 🂠',
    'table.submitHiddenTrump': 'Submit hidden trump 🂠',
    'table.orFaceDown': 'Or play a hand card face-down 🂠',
    'table.voidFaceDown': 'Void — this card plays face-down 🂠',
    'table.partner': 'partner',
    'table.secretTrump': 'Your secret trump: {rank}{suit}',
    'table.trumpLabel': 'Trump:',

    // Scoreboard
    'score.roundLong': 'Round {n}',
    'score.roundShort': 'R{n}',
    'score.usLong': '{team} (you)',
    'score.usShort': 'Us',
    'score.themShort': 'Them',
    'score.bidToBeatLong': 'Bid to beat',
    'score.bidToBeatShort': 'Bid',
    'score.trump': 'Trump',
    'score.roundsWonLong': 'Rounds won',
    'score.roundsWonShort': 'Won',

    // Round end modal
    'round.teamWins': '🎉 Your team wins the round!',
    'round.oppWins': '😞 Opponents win the round',
    'round.summary': '{name} bid {bid} for {team} and took {points} points — the bid {result}.',
    'round.made': 'was made',
    'round.failed': 'failed',
    'round.pts': 'pts',
    'round.rounds': 'rounds',
    'round.next': 'Next round →',

    // Mute button
    'mute.mute': 'Mute sounds',
    'mute.unmute': 'Unmute sounds',

    // Teams
    'team.0': 'North / South',
    'team.1': 'East / West',

    // Suits
    'suit.S': '♠ Spades',
    'suit.H': '♥ Hearts',
    'suit.D': '♦ Diamonds',
    'suit.C': '♣ Clubs',

    // Dynamic engine messages
    'msg.roundDeals': 'Round {round} — {name} deals. Bidding opens at {minBid}.',
    'msg.passes': '{name} passes.',
    'msg.bids': '{name} bids {bid}.',
    'msg.redeal': 'Everyone passed — the hand is thrown in and redealt.',
    'msg.auctionWon': '{name} wins the auction at {bid} and now sets the trump.',
    'msg.trumpSetOpen': '{name} sets the trump — it is {suitWord}! {leader} leads.',
    'msg.trumpSetHidden': '{name} placed the trump face down. {leader} leads.',
    'msg.trumpAsked': '{name} asks for the trump — it is {suitWord}!',
    'msg.trumpAutoRevealed': 'The trump is revealed automatically — it was {suitWord}.',
    'msg.hiddenCardExposesTrump': '{name}’s hidden card exposes the trump — it is {suitWord}!',
    'msg.takesTrick': '{name} takes the trick (+{points} points).',
    'msg.bidMade': 'Bid made! The bidding team took {points} of {bid}.',
    'msg.bidFailed': 'Bid failed — the bidding team took only {points} of {bid}.',
    'msg.leadsNextTrick': '{name} leads the next trick.',
  },
  si: {
    // Home screen
    'home.welcomeBack': 'නැවත සාදරයෙන් පිළිගනිමු, {name}!',
    'home.welcome': 'සාදරයෙන් පිළිගනිමු!',
    'home.tagline': '304 — දකුණු ඉන්දීය සම්භාව්‍ය කාඩ්පත් ක්‍රීඩාව.',
    'home.namePlaceholder': 'ඔබේ නම',
    'home.newGame': 'නව ක්‍රීඩාවක්',
    'home.resumeGame': 'ක්‍රීඩාව නැවත ආරම්භ කරන්න',
    'home.howToPlay': 'ක්‍රීඩා කරන ආකාරය',

    // Game modes
    'mode.classic.label': 'සම්භාව්‍ය',
    'mode.classic.description':
      'නායක කාඩ්පත (ට්‍රම්ප්) සැඟවී පවතින්නේ, ඇරඹූ කාඩ්පත් වර්ගය අතේ නොමැති ක්‍රීඩකයෙකු එය හෙළි කරන ලෙස ඉල්ලා සිටින තෙක් ය.',
    'mode.blind.label': 'අන්ධ',
    'mode.blind.description':
      'කාඩ්පත් 24ක සීරුමාරු කළ (7 සහ 8 නොමැති) කට්ටලයකින් ක්‍රීඩා කෙරේ — එක් අයෙකුට කාඩ්පත් 6ක්, වරකට 3 බැගින් බෙදනු ලැබේ. කිසිවෙකුට ට්‍රම්ප් හෙළි කරන ලෙස ඉල්ලා සිටිය නොහැක. ඇරඹූ කාඩ්පත් වර්ගය අතේ නොමැති ඕනෑම අයෙකු කාඩ්පතක් යටිකුරුවට තැබිය යුතුය — එය ට්‍රම්ප් වර්ගයට ගැලපේ නම් ට්‍රම්ප් හෙළි වේ, නැතිනම් එය සදහටම සැඟවී පවතී. ලංසුකරුට පමණක් තමන් වෙන් කරගත් ට්‍රම්ප් කාඩ්පතම ඉදිරිපත් කර දැනුවත්වම එය හෙළි කළ හැක. කෙසේ වුවත්, එම අත අවසන් වූ පසුව පමණක් හෙළිදරව්ව දැනුම් දෙනු ලැබේ.',
    'mode.open.label': 'විවෘත',
    'mode.open.description': 'ලංසුකරු ට්‍රම්ප් තීරණය කරන මොහොතේම එය සියලු දෙනාට හෙළි වේ.',

    // How to play modal
    'htp.title': 'ක්‍රීඩා කරන ආකාරය',
    'htp.step1': 'පළමු බෙදීම — සෑම කෙනෙකුටම කාඩ්පත් 4ක් ලැබේ.',
    'htp.step2':
      'ලංසු තැබීම — බෙදන්නාගේ වම් පසින් සිටින්නාගෙන් ආරම්භ කර, ක්‍රීඩකයන් ලංසු තබයි (අවම 200, 10 බැගින් වැඩි කරමින්, උපරිම 304) නැතහොත් පාස් වේ. පාස් වීම අවසානයි. ඉහළම ලංසුකරුට ට්‍රම්ප් තීරණය කිරීමේ අයිතිය හිමි වේ. සියලු දෙනා පාස් වුවහොත් අත නැවත බෙදනු ලැබේ.',
    'htp.step3': 'ට්‍රම්ප් තේරීම — ලංසුකරු තම අතේ ඇති එක් කාඩ්පතක් යටිකුරුවට තබයි; එහි වර්ගය රහසිගත ට්‍රම්ප් වේ.',
    'htp.step4': 'දෙවන බෙදීම — තවත් කාඩ්පත් 4ක් බැගින් (ට්‍රම්ප් හෙළි වන තෙක් ලංසුකරු එක් කාඩ්පතක් අඩුවෙන් සෙල්ලම් කරයි).',
    'htp.step5':
      'අත් සෙල්ලම් කිරීම — බෙදන්නාගේ වම් පසින් සිටින්නා මුල පටන් ගනියි. හැකි නම් ඔබ ඇරඹූ කාඩ්පත් වර්ගයම දැමිය යුතුය. එසේ නොහැකි නම්, සැඟවුණු කාඩ්පත හෙළි කිරීමට "ට්‍රම්ප් හෙළි කරන්න" ක්ලික් කළ හැක; ඉන් පසු ට්‍රම්ප් වර්ගය සියල්ලම පරදවයි.',
    'htp.step6': 'ලකුණු ගණන් කිරීම — ලංසුකාර කණ්ඩායම තම ලංසුවට සමාන හෝ වැඩි කාඩ්පත් ලකුණු ලබා ගත යුතුය.',
    'htp.cardRanking':
      'කාඩ්පත් අනුපිළිවෙල (ඉහළ → පහළ): J, 9, A, 10, K, Q, 8, 7 — ලකුණු 30, 20, 11, 10, 3, 2, 0, 0. වර්ග 4 × ලකුණු 76 = මුළු ලකුණු 304.',
    'htp.houseRulesTitle': 'මෙම ක්‍රියාත්මක කිරීමේදී භාවිත වන විශේෂ නීති:',
    'htp.rule1': 'ට්‍රම්ප් කිරීම අවසර ඇත, නමුත් ඇරඹූ කාඩ්පත් වර්ගය නොමැති විටත් එය කිසි විටෙක බලෙන් අවශ්‍ය නොවේ.',
    'htp.rule2': 'ට්‍රම්ප් හෙළි වන අත මුළුමනින්ම ට්‍රම්ප් රීතියට යටත් වේ.',
    'htp.rule3': 'හෙළි කිරීමේදී, සැඟවුණු කාඩ්පත නැවත ලංසුකරුගේ අතට එකතු වේ.',
    'htp.rule4':
      'කිසිවෙකු හෙළි කිරීමට ඉල්ලා නොසිටියහොත්, ලංසුකරු තම අවසන් (සැඟවුණු) කාඩ්පත සෙල්ලම් කළ යුතු මොහොතේදී ට්‍රම්ප් ස්වයංක්‍රීයව හෙළි වේ, එමගින් ලකුණු 304ම සැමවිටම බෙදී යයි.',
    'htp.rule5': 'සියලු ක්‍රීඩකයන් ලංසු තැබීමේදී පාස් වුවහොත්, එම බෙදන්නාම නැවත බෙදයි.',
    'htp.gotIt': 'තේරුණා',

    // Confirm new game modal
    'confirm.title': 'නව ක්‍රීඩාවක් ආරම්භ කරන්නද?',
    'confirm.body': 'ඔබට දැනටමත් ක්‍රියාත්මක ක්‍රීඩාවක් ඇත. නව ක්‍රීඩාවක් ආරම්භ කිරීමෙන් එය ඉවත් වේ.',
    'confirm.discard': 'ඉවත දමා නව ක්‍රීඩාවක් ආරම්භ කරන්න',
    'confirm.cancel': 'අවලංගු කරන්න',

    // Trump select modal
    'trumpSelect.title': 'ඔබ {bid}ට ලංසුව දිනා ගත්තා!',
    'trumpSelect.body': 'යටිකුරුවට තැබීමට කාඩ්පතක් තෝරන්න — එහි වර්ගය රහසිගත ට්‍රම්ප් වේ.',

    // Bidding modal
    'bid.title': 'ඔබේ ලංසුව',
    'bid.opensAt': 'ලංසු තැබීම {min}න් ආරම්භ වේ.',
    'bid.holdsAt': '{name} {bid}හි ලංසුව රඳවාගෙන සිටියි.',
    'bid.pass': 'පාස්',

    // Table
    'table.revealTrump': 'ට්‍රම්ප් හෙළි කරන්න 🂠',
    'table.submitHiddenTrump': 'සැඟවුණු ට්‍රම්ප් ඉදිරිපත් කරන්න 🂠',
    'table.orFaceDown': 'නැතහොත් අතේ කාඩ්පතක් යටිකුරුවට තබන්න 🂠',
    'table.voidFaceDown': 'හිස් — මෙම කාඩ්පත යටිකුරුවට තැබේ 🂠',
    'table.partner': 'සහකරු',
    'table.secretTrump': 'ඔබේ රහසිගත ට්‍රම්ප්: {rank}{suit}',
    'table.trumpLabel': 'ට්‍රම්ප්:',

    // Scoreboard
    'score.roundLong': 'රවුම {n}',
    'score.roundShort': 'ර{n}',
    'score.usLong': '{team} (ඔබ)',
    'score.usShort': 'අපි',
    'score.themShort': 'ඔවුන්',
    'score.bidToBeatLong': 'පරදවිය යුතු ලංසුව',
    'score.bidToBeatShort': 'ලංසුව',
    'score.trump': 'ට්‍රම්ප්',
    'score.roundsWonLong': 'දිනූ රවුම්',
    'score.roundsWonShort': 'දිනුම්',

    // Round end modal
    'round.teamWins': '🎉 ඔබේ කණ්ඩායම රවුම දිනුවා!',
    'round.oppWins': '😞 විරුද්ධ කණ්ඩායම රවුම දිනුවා',
    'round.summary': '{name}, {team} වෙනුවෙන් {bid}ට ලංසු තබා ලකුණු {points}ක් ලබා ගත්තා — ලංසුව {result}.',
    'round.made': 'සම්පූර්ණ විය',
    'round.failed': 'අසාර්ථක විය',
    'round.pts': 'ලකුණු',
    'round.rounds': 'රවුම්',
    'round.next': 'ඊළඟ රවුම →',

    // Mute button
    'mute.mute': 'ශබ්ද නිශ්ශබ්ද කරන්න',
    'mute.unmute': 'ශබ්ද සක්‍රිය කරන්න',

    // Teams
    'team.0': 'උතුර / දකුණ',
    'team.1': 'නැගෙනහිර / බස්නාහිර',

    // Suits
    'suit.S': '♠ ස්පේඩ්',
    'suit.H': '♥ හාට්',
    'suit.D': '♦ ඩයමන්ඩ්',
    'suit.C': '♣ ක්ලබ්',

    // Dynamic engine messages
    'msg.roundDeals': 'රවුම {round} — {name} බෙදයි. ලංසු තැබීම {minBid}න් ආරම්භ වේ.',
    'msg.passes': '{name} පාස් වේ.',
    'msg.bids': '{name} {bid}ට ලංසු තබයි.',
    'msg.redeal': 'සියලු දෙනා පාස් වූහ — අත ඉවත දමා නැවත බෙදනු ලැබේ.',
    'msg.auctionWon': '{name} {bid}ට ලංසුව දිනා දැන් ට්‍රම්ප් තීරණය කරයි.',
    'msg.trumpSetOpen': '{name} ට්‍රම්ප් තීරණය කරයි — එය {suitWord}! {leader} මුල පටන් ගනියි.',
    'msg.trumpSetHidden': '{name} ට්‍රම්ප් යටිකුරුවට තැබුවා. {leader} මුල පටන් ගනියි.',
    'msg.trumpAsked': '{name} ට්‍රම්ප් හෙළි කරන ලෙස ඉල්ලයි — එය {suitWord}!',
    'msg.trumpAutoRevealed': 'ට්‍රම්ප් ස්වයංක්‍රීයව හෙළි විය — එය {suitWord}.',
    'msg.hiddenCardExposesTrump': '{name}ගේ සැඟවුණු කාඩ්පතෙන් ට්‍රම්ප් හෙළි විය — එය {suitWord}!',
    'msg.takesTrick': '{name} අත දිනා ගනියි (+{points} ලකුණු).',
    'msg.bidMade': 'ලංසුව සම්පූර්ණ විය! ලංසුකාර කණ්ඩායම {bid}න් {points}ක් ලබා ගත්තා.',
    'msg.bidFailed': 'ලංසුව අසාර්ථක විය — ලංසුකාර කණ්ඩායමට {bid}න් ලැබුණේ {points}ක් පමණි.',
    'msg.leadsNextTrick': '{name} ඊළඟ අත ආරම්භ කරයි.',
  },
};
