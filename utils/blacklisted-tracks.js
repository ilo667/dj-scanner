function getBlacklistedTracks(lines, blacklistedNames) {
    if (!blacklistedNames.length) return [];

    const lower = blacklistedNames.map(n => n.toLowerCase());

    return lines.filter(line =>
        lower.some(name => line.toLowerCase().includes(name))
    );
}

module.exports = { getBlacklistedTracks };
