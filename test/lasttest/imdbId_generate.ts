export function generateImdbId() {
    const praefix = 'tt';

    const nummer = String(Math.floor(Math.random() * 10_000_000)).padStart(
        7,
        '0',
    );

    // Format: tt1234567
    return `${praefix}${nummer}`;
}
