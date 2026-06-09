const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseArtists } = require('./parser');

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
