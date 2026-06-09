const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseArtists, separateArtists } = require('./parser');

describe('plain text format', () => {
    test('Artist - Track', () => {
        assert.deepEqual(parseArtists('Artist One - Track Name'), ['Artist One']);
    });

    test('01. Artist - Track', () => {
        assert.deepEqual(parseArtists('01. Artist One - Track Name'), ['Artist One']);
    });

    test('1) Artist - Track', () => {
        assert.deepEqual(parseArtists('1) Artist One - Track Name'), ['Artist One']);
    });

    test('multiple lines', () => {
        const input = 'Artist One - Track\nArtist Two - Track';
        assert.deepEqual(parseArtists(input), ['Artist One', 'Artist Two']);
    });

    test('deduplication', () => {
        const input = 'Artist One - Track\nArtist One - Another Track';
        assert.deepEqual(parseArtists('Artist One - Track\nArtist One - Another Track'), ['Artist One']);
    });

    test('empty input returns empty array', () => {
        assert.deepEqual(parseArtists(''), []);
    });

    test('null input returns empty array', () => {
        assert.deepEqual(parseArtists(null), []);
    });

    test('undefined input returns empty array', () => {
        assert.deepEqual(parseArtists(undefined), []);
    });
});

describe('duet exceptions — & not split', () => {
    const duets = [
        'Above & Beyond',
        'Camo & Krooked',
        'Chase & Status',
        'Derrick & Tonika',
        'Drumsound & Bassline Smith',
        'Dutch & Graft',
        'Follix & Back Up',
        'Freaks & Geeks',
        'Fred V & Grafix',
        'Gancher & Ruin',
        'Kryptic Minds & Leon Switch',
        'Macca & Loz Contreras',
        'Matrix & Futurebound',
        'Pola & Bryson',
        'ressotto & wcry',
        'T & Sugah',
        'Zahharov & Alina Enn',
    ];

    for (const duet of duets) {
        test(`${duet} - Track`, () => {
            const result = parseArtists(`${duet} - Track Name`);
            assert.ok(result.includes(duet), `"${duet}" should not be split`);
        });
    }

    test('duet combined with another artist — Chase & Status & Sub Focus - Track', () => {
        const result = parseArtists('Chase & Status & Sub Focus - Track');
        assert.ok(result.includes('Chase & Status'));
        assert.ok(result.includes('Sub Focus'));
    });

    test('duet in feat — Artist - Track (feat. Pola & Bryson)', () => {
        const result = parseArtists('Artist - Track (feat. Pola & Bryson)');
        assert.ok(result.includes('Pola & Bryson'));
        assert.equal(result.filter(a => a === 'Pola').length, 0);
    });

    test('duet in remix — Track (Fred V & Grafix Remix)', () => {
        const result = parseArtists('Artist - Track (Fred V & Grafix Remix)');
        assert.ok(result.includes('Fred V & Grafix'));
        assert.equal(result.filter(a => a === 'Fred V').length, 0);
    });
});

describe('multiple artists', () => {
    test('A & B - Track', () => {
        const result = parseArtists('Artist A & Artist B - Track');
        assert.deepEqual(result, ['Artist A', 'Artist B']);
    });

    test('A, B - Track', () => {
        const result = parseArtists('Artist A, Artist B - Track');
        assert.deepEqual(result, ['Artist A', 'Artist B']);
    });

    test('A feat. B - Track', () => {
        const result = parseArtists('Artist A feat. Artist B - Track');
        assert.deepEqual(result, ['Artist A', 'Artist B']);
    });

    test('A ft. B - Track', () => {
        const result = parseArtists('Artist A ft. Artist B - Track');
        assert.deepEqual(result, ['Artist A', 'Artist B']);
    });

    test('A and B - Track', () => {
        const result = parseArtists('Georgia Yates and Bev Lee Harling - Track');
        assert.deepEqual(result, ['Georgia Yates', 'Bev Lee Harling']);
    });

    test('A vs. B - Track', () => {
        const result = parseArtists('Sub Focus vs. Wilkinson - Track');
        assert.deepEqual(result, ['Sub Focus', 'Wilkinson']);
    });

    test('A vs B - Track (without dot)', () => {
        const result = parseArtists('Artist A vs Artist B - Track');
        assert.deepEqual(result, ['Artist A', 'Artist B']);
    });

    test('combined separators A & B and C - Track', () => {
        const result = parseArtists('Artist A & Artist B and Artist C - Track');
        assert.ok(result.includes('Artist A'));
        assert.ok(result.includes('Artist B'));
        assert.ok(result.includes('Artist C'));
    });
});

describe('feat in title', () => {
    test('Track (feat. Guest)', () => {
        const result = parseArtists('Artist - Track (feat. Guest Artist)');
        assert.ok(result.includes('Artist'));
        assert.ok(result.includes('Guest Artist'));
    });

    test('Track (ft. Guest)', () => {
        const result = parseArtists('Artist - Track (ft. Guest Artist)');
        assert.ok(result.includes('Artist'));
        assert.ok(result.includes('Guest Artist'));
    });

    test('feat multiple guests', () => {
        const result = parseArtists('Artist - Track (feat. Guest A & Guest B)');
        assert.ok(result.includes('Guest A'));
        assert.ok(result.includes('Guest B'));
    });
});

describe('remix in title', () => {
    test('Track (Remixer Remix)', () => {
        const result = parseArtists('Artist - Track (Remixer Remix)');
        assert.ok(result.includes('Artist'));
        assert.ok(result.includes('Remixer'));
    });
});

describe('CUE format', () => {
    test('PERFORMER + TITLE', () => {
        const input = `
TRACK 01 AUDIO
  TITLE "Track Name"
  PERFORMER "Artist One"
TRACK 02 AUDIO
  TITLE "Another Track"
  PERFORMER "Artist Two"
        `.trim();
        const result = parseArtists(input);
        assert.ok(result.includes('Artist One'));
        assert.ok(result.includes('Artist Two'));
    });

    test('TITLE with "Artist - Track" format', () => {
        const input = `
TRACK 01 AUDIO
  TITLE "Artist One - Track Name"
TRACK 02 AUDIO
  TITLE "Artist Two - Another Track"
        `.trim();
        const result = parseArtists(input);
        assert.ok(result.includes('Artist One'));
        assert.ok(result.includes('Artist Two'));
    });
});

describe('Spotify CSV format', () => {
    test('single artist per track', () => {
        const input = [
            'Spotify URI,Track Name,Artist Name(s),Album Name',
            'spotify:track:1,"Track One","Artist One","Album"',
            'spotify:track:2,"Track Two","Artist Two","Album"',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('Artist One'));
        assert.ok(result.includes('Artist Two'));
    });

    test('multiple artists separated by semicolon', () => {
        const input = [
            'Spotify URI,Track Name,Artist Name(s),Album Name',
            'spotify:track:1,"Track","Artist A;Artist B;Artist C","Album"',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('Artist A'));
        assert.ok(result.includes('Artist B'));
        assert.ok(result.includes('Artist C'));
    });

    test('deduplication across tracks', () => {
        const input = [
            'Spotify URI,Track Name,Artist Name(s),Album Name',
            'spotify:track:1,"Track One","Artist One","Album"',
            'spotify:track:2,"Track Two","Artist One","Album"',
        ].join('\n');
        const result = parseArtists(input);
        assert.equal(result.filter(a => a === 'Artist One').length, 1);
    });
});

// Apple Music real-world patterns
describe('Apple Music track name patterns', () => {
    test('feat. with comma and & — Again (feat. Ms Banks, Ms. Dynamite & JayKae)', () => {
        const result = parseArtists('Again (feat. Ms Banks, Ms. Dynamite & JayKae)');
        assert.ok(result.includes('Ms Banks'));
        assert.ok(result.includes('Ms. Dynamite'));
        assert.ok(result.includes('JayKae'));
    });

    test('feat. with & — Time Is Hardcore (feat. Kae Tempest & Anita Blay)', () => {
        const result = parseArtists('Time Is Hardcore (feat. Kae Tempest & Anita Blay)');
        assert.ok(result.includes('Kae Tempest'));
        assert.ok(result.includes('Anita Blay'));
    });

    test('feat. with and — Falling Out of Consciousness (feat. Georgia Yates and Bev Lee Harling)', () => {
        const result = parseArtists('Falling Out of Consciousness (feat. Georgia Yates and Bev Lee Harling)');
        assert.ok(result.includes('Georgia Yates'));
        assert.ok(result.includes('Bev Lee Harling'));
    });

    test('remix with vs. — Just Hold On (Sub Focus & Wilkinson vs. Pola & Bryson Remix)', () => {
        const result = parseArtists('Just Hold On (Sub Focus & Wilkinson vs. Pola & Bryson Remix)');
        assert.ok(result.includes('Sub Focus'));
        assert.ok(result.includes('Wilkinson'));
        assert.ok(result.includes('Pola & Bryson'));
    });

    test('remix with dot in name — Always Yours (S.P.Y Remix)', () => {
        const result = parseArtists('Always Yours (S.P.Y Remix)');
        assert.ok(result.includes('S.P.Y'));
    });

    test('feat. with multiple & — Murder Music (feat. Kabaka Pyramid & Ms. Dynamite)', () => {
        const result = parseArtists('Murder Music (feat. Kabaka Pyramid & Ms. Dynamite)');
        assert.ok(result.includes('Kabaka Pyramid'));
        assert.ok(result.includes('Ms. Dynamite'));
    });
});

// Spotify CSV real-world patterns
describe('Spotify CSV real-world patterns', () => {
    test('real Exportify column order: Track URI, Track Name, Album Name, Artist Name(s)', () => {
        const input = [
            'Track URI,Track Name,Album Name,Artist Name(s),Release Date',
            'spotify:track:1,"Full Send - Pirapus Remix","Full Send (Pirapus Remix)","1991;Pirapus",2026-05-14',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('1991'));
        assert.ok(result.includes('Pirapus'));
    });

    test('artist name with & is preserved as one artist — Pola & Bryson', () => {
        const input = [
            'Track URI,Track Name,Album Name,Artist Name(s),Release Date',
            'spotify:track:1,"Close To You","Album","ARLE;Pola & Bryson",2017-06-23',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('Pola & Bryson'));
        assert.ok(result.includes('ARLE'));
        assert.equal(result.filter(a => a === 'Pola').length, 0);
    });

    test('artist with & in name alongside other artists — Above & Beyond;Zoë Johnston;Koven', () => {
        const input = [
            'Track URI,Track Name,Album Name,Artist Name(s),Release Date',
            'spotify:track:1,"Carry Me Home","Album","Above & Beyond;Zoë Johnston;Koven",2026-04-24',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('Above & Beyond'));
        assert.ok(result.includes('Zoë Johnston'));
        assert.ok(result.includes('Koven'));
    });

    test('artist name that is a number — 1991', () => {
        const input = [
            'Track URI,Track Name,Album Name,Artist Name(s),Release Date',
            'spotify:track:1,"Icarus","Icarus","1991;TW3LVE",2026-02-20',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('1991'));
        assert.ok(result.includes('TW3LVE'));
    });

    test('artist names with special characters — [IVY], ÆON:MODE, goddard.', () => {
        const input = [
            'Track URI,Track Name,Album Name,Artist Name(s),Release Date',
            'spotify:track:1,"Car Crash","Car Crash","[IVY];XIRA",2026-06-05',
            'spotify:track:2,"Glow","Glow","Delta Heavy;ÆON:MODE;Nu-La",2026-04-02',
            'spotify:track:3,"day & night","day & night","goddard.",2026-05-21',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('[IVY]'));
        assert.ok(result.includes('ÆON:MODE'));
        assert.ok(result.includes('goddard.'));
    });
});

// YouTube Music real-world patterns
describe('YouTube Music track name patterns', () => {
    test('ft. in artist part — Flume ft. Toro Y Moi - The Difference (High Contrast Remix)', () => {
        const result = parseArtists('Flume ft. Toro Y Moi - The Difference (High Contrast Remix)');
        assert.ok(result.includes('Flume'));
        assert.ok(result.includes('Toro Y Moi'));
        assert.ok(result.includes('High Contrast'));
    });

    test('comma-separated artists — OB1, Creatures & Revan - Fat Twins', () => {
        const result = parseArtists('OB1, Creatures & Revan - Fat Twins');
        assert.ok(result.includes('OB1'));
        assert.ok(result.includes('Creatures'));
        assert.ok(result.includes('Revan'));
    });

    test('& + ft. + remix — Moby & goddard. ft. Lovelle - Stereo (High Contrast Remix)', () => {
        const result = parseArtists('Moby & goddard. ft. Lovelle - Stereo (High Contrast Remix)');
        assert.ok(result.includes('Moby'));
        assert.ok(result.includes('goddard.'));
        assert.ok(result.includes('Lovelle'));
        assert.ok(result.includes('High Contrast'));
    });

    test('vs without dot — Fatboy Slim vs Shao Bao - Купила мама коника', () => {
        const result = parseArtists('Fatboy Slim vs Shao Bao - Купила мама коника (Yura Van Gogh mash-up)');
        assert.ok(result.includes('Fatboy Slim'));
        assert.ok(result.includes('Shao Bao'));
    });

    test('ft. inside parens with dotted name — S.P.Y - Sweet Sound (ft. The Melody Men)', () => {
        const result = parseArtists('S.P.Y - Sweet Sound (ft. The Melody Men)');
        assert.ok(result.includes('S.P.Y'));
        assert.ok(result.includes('The Melody Men'));
    });

    test('comma + & — SILK, Subsonic & Nito Onna - I NEED U 2', () => {
        const result = parseArtists('SILK, Subsonic & Nito Onna - I NEED U 2 (Lyrics)');
        assert.ok(result.includes('SILK'));
        assert.ok(result.includes('Subsonic'));
        assert.ok(result.includes('Nito Onna'));
    });

    test('& + comma + Ft. — Kryptic Minds & Leon Switch, Dekota Ft. Skitty - Drifting Away', () => {
        const result = parseArtists('Kryptic Minds & Leon Switch, Dekota Ft. Skitty - Drifting Away');
        assert.ok(result.includes('Kryptic Minds & Leon Switch'));
        assert.ok(result.includes('Dekota'));
        assert.ok(result.includes('Skitty'));
    });

    test('artist name with dots — A.M.C - There In 10', () => {
        const result = parseArtists('A.M.C - There In 10 [UKF Release]');
        assert.ok(result.includes('A.M.C'));
    });
});

// Deezer real-world patterns
describe('Deezer track name patterns', () => {
    test('numeric remixer — Perfect (Exceeder) (1991 Remix)', () => {
        const result = parseArtists('Perfect (Exceeder) (1991 Remix)');
        assert.ok(result.includes('1991'));
    });

    test('feat. with & — Green & Gold (feat. Charlotte Plank & Riko Dan)', () => {
        const result = parseArtists('Green & Gold (feat. Charlotte Plank & Riko Dan)');
        assert.ok(result.includes('Charlotte Plank'));
        assert.ok(result.includes('Riko Dan'));
    });

    test('feat. with & — Ram Pam (feat. Mystic Marley & Flowdan)', () => {
        const result = parseArtists('Ram Pam (feat. Mystic Marley & Flowdan)');
        assert.ok(result.includes('Mystic Marley'));
        assert.ok(result.includes('Flowdan'));
    });

    test('feat. with & — 96 (feat. Shapes & Dada Jones)', () => {
        const result = parseArtists('96 (feat. Shapes & Dada Jones)');
        assert.ok(result.includes('Shapes'));
        assert.ok(result.includes('Dada Jones'));
    });

    test('remixer name with X — No Tomorrow (P Money X Whiney Remix)', () => {
        const result = parseArtists('No Tomorrow (P Money X Whiney Remix)');
        assert.ok(result.includes('P Money X Whiney'));
    });

    test('simple feat. — Sleepwalking (feat. Songer)', () => {
        const result = parseArtists('Sleepwalking (feat. Songer)');
        assert.ok(result.includes('Songer'));
    });

    test('simple feat. — Alibi (feat. Rudimental)', () => {
        const result = parseArtists('Alibi (feat. Rudimental)');
        assert.ok(result.includes('Rudimental'));
    });
});

describe('TSV format (Beatport export)', () => {
    test('tab-separated with Track Title and Artist columns', () => {
        const input = [
            '#\tTrack Title\tArtist\tBPM',
            '1\tTrack Name\tArtist One\t128',
            '2\tAnother Track\tArtist Two\t130',
        ].join('\n');
        const result = parseArtists(input);
        assert.ok(result.includes('Artist One'));
        assert.ok(result.includes('Artist Two'));
    });

    test('returns empty if no Track Title column', () => {
        const input = '#\tName\tArtist\n1\tTrack\tArtist One';
        const result = parseArtists(input);
        assert.equal(result.length, 0);
    });
});

describe('separateArtists — used for Apple Music artistName and YouTube channel title', () => {
    test('duet with & is preserved — Chase & Status', () => {
        assert.deepEqual(separateArtists('Chase & Status'), ['Chase & Status']);
    });

    test('duet with & is preserved — Camo & Krooked', () => {
        assert.deepEqual(separateArtists('Camo & Krooked'), ['Camo & Krooked']);
    });

    test('duet with & is preserved — Kryptic Minds & Leon Switch combined with another', () => {
        const result = separateArtists('Kryptic Minds & Leon Switch, Dekota');
        assert.ok(result.includes('Kryptic Minds & Leon Switch'));
        assert.ok(result.includes('Dekota'));
    });

    test('non-duet & is split — RoyGreen, Protone & Ben Soundscape', () => {
        const result = separateArtists('RoyGreen, Protone & Ben Soundscape');
        assert.ok(result.includes('RoyGreen'));
        assert.ok(result.includes('Protone'));
        assert.ok(result.includes('Ben Soundscape'));
        assert.equal(result.filter(a => a === 'Protone & Ben Soundscape').length, 0);
    });

    test('non-duet & is split — SAMOGON & BASS', () => {
        const result = separateArtists('SAMOGON & BASS');
        assert.ok(result.includes('SAMOGON'));
        assert.ok(result.includes('BASS'));
    });

    test('comma-separated artists are split', () => {
        const result = separateArtists('Artist A, Artist B');
        assert.deepEqual(result, ['Artist A', 'Artist B']);
    });

    test('single artist returned as-is', () => {
        assert.deepEqual(separateArtists('Sub Focus'), ['Sub Focus']);
    });
});
