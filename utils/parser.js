const TRACK_NUMBER_REGEX = /^\d+(?:\.\d+)*[\.\)]\s*/;
const ARTIST_SEPARATOR_REGEX = /\s*(?:&|,|\b(?:feat|ft)\b\.?)\s*/i;
const REMIX_REGEX = /\(([^()]+?)\s+Remix\)/i;
const FEAT_REGEX = /\(\s*(?:\b(?:feat|ft)\b\.?)\s+([^)]+)\)/i;

// remove spaces
function normalizeLine(input) {
    return (input || '').trim();
}

// remove "01. ", "1. ", "01) " etc
function removeTrackNumber(trackLine) {
    return trackLine.replace(TRACK_NUMBER_REGEX, '');
}
// remove quotes
function unquote(quotedText) {
    return quotedText.replace(/^"(.*)"$/, '$1');
}

// split by & , feat, ft, comma
function separateArtists(artistPart) {
    return artistPart
        .split(ARTIST_SEPARATOR_REGEX)
        .map(artistName => artistName.trim())
        .filter(Boolean);
}

// get artist part (before ' - ')
function getArtistPart(trackLine) {
    return trackLine.split(' - ')[0];
}

/**
 * Extract artists from title string:
 * - (NAME Remix) => NAME
 * - (feat. A & B) / (ft. A, B) => A, B
 */
function extractArtistsFromTitle(title) {
    const artists = [];
    const remixMatch = title.match(REMIX_REGEX);

    if (remixMatch?.[1]) {
        artists.push(remixMatch[1].trim());
    }

    const featMatch = title.match(FEAT_REGEX);

    if (featMatch?.[1]) {
        artists.push(...separateArtists(featMatch[1]));
    }

    return artists;
}

/**
 * Parse one "track line" like:
 * "01. A & B - Track Name (feat. MC XYZ) (ABC Remix)"
 */
function getArtistsFromTrackLine(trackLine) {
    const trackLineNormalized = removeTrackNumber(trackLine);
    const artistNames = [];

    // remix/feat anywhere in the string
    artistNames.push(...extractArtistsFromTitle(trackLineNormalized));

    // main artists only if we have " - "
    if (trackLineNormalized.includes(' - ')) {
        artistNames.push(...separateArtists(getArtistPart(trackLineNormalized)));
    }

    return artistNames;
}

/**
 * Extract "track lines" from input:
 * - If CUE => get TITLE and if needed combine PERFORMER + TITLE into "Performer - Title"
 * - Else => each non-empty line is a track string
 */
function getTrackLines(input) {
    const text = input || '';
    const isCueFormat = /\n\s*TRACK\s+\d+/i.test(text) || /^\s*TRACK\s+\d+/im.test(text);

    if (!isCueFormat) {
        return text
            .split('\n')
            .map(normalizeLine)
            .filter(Boolean);
    }

    const lines = text.split(/\r?\n/);
    const trackLines = [];

    let inTrack = false;
    let currentTitle = '';
    let waitingPerformer = false;

    for (const raw of lines) {
        const line = normalizeLine(raw);

        // starts of new track
        if (/^TRACK\s+\d+/i.test(line)) {
            inTrack = true;
            currentTitle = '';
            waitingPerformer = false;
            continue;
        }

        // ignore all before first TRACK
        if (!inTrack) continue;

        // TITLE
        if (line.startsWith('TITLE')) {
            currentTitle = unquote(normalizeLine(line.replace(/^TITLE\s+/i, '')));
            currentTitle = removeTrackNumber(currentTitle);

            if (currentTitle.includes(' - ')) {
                trackLines.push(currentTitle);
                waitingPerformer = false;
            } else {
                // TITLE without " - " → waiting PERFORMER
                waitingPerformer = true;
            }

            continue;
        }

        // PERFORMER (only after TITLE without "-")
        if (waitingPerformer && line.startsWith('PERFORMER')) {
            const performer = unquote(normalizeLine(line.replace(/^PERFORMER\s+/i, '')));
            // normalize cue into standard "Artist - Title"
            trackLines.push(`${performer} - ${currentTitle}`);
            waitingPerformer = false;
        }
    }

    return trackLines;
}

/**
 * One unified function for CUE + plain tracklist
 */
function parseArtists(input) {
    const trackLines = getTrackLines(input);
    const artists = trackLines.flatMap(getArtistsFromTrackLine);

    return [...new Set(
        artists
            .map(normalizeLine)
            .filter(Boolean)
    )];
}

module.exports = {
    parseArtists
};
