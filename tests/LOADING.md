# Loading resilience

The previous loader awaited only the video's `loadeddata` event, all audio downloads,
all image events and the leaderboard in one unbounded `Promise.all`. Video errors
updated a label without settling that promise. START then awaited both playback
and all audio decoding. Neither wait had a deadline.

The initial loader now settles when images, audio downloads and the existing
leaderboard request settle, or after 5000 ms, whichever comes first. The video
loads independently. Failures settle rather than rejecting the loader; late
completions cannot reset game state or pause the video. Browser timers cannot run
while the browser suspends the page, but no extra delay is scheduled on readiness.

START requests AudioContext activation and video playback directly in the click
handler, then starts the existing game clock without awaiting either. Missing
media only removes that media; pending play, resume or decode promises do not own
the clock. Audio arriving after START is decoded individually. Delayed cues are
not replayed after their useful time or after Replay.

The optional metadata-time seek to 0.001 seconds requests an initial frame without
autoplay. It is cancelled at START and resets to zero for the game. Embedded
browsers can still decline to render a paused frame; this is never a readiness
condition. No video/audio file or codec was changed.

References:
- https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari
- https://webkit.org/blog/6784/new-video-policies-for-ios/

Run `npm test` for deadline, errors, metadata/START race and late audio tests.
Browser fault tests override the media source setter (no metadata/data events),
make play hang/reject/throw and make audio fetch hang/reject before importing the
game. Each test clicks the real START button and verifies countdown and no
unhandled errors. `/?test` runs two full rounds with an isolated in-memory board.
These simulations do not substitute for physical iPhone/Instagram verification.

Observed Firefox headless fault-test results (13 September 2026): normal cold
load about 1.9 seconds; missing video events about 0.65 seconds; rejected/throwing
playback and failed audio about 0.2–0.3 seconds. Hung audio released on the 5000 ms
timer (about 5.1 seconds measured from HTML evaluation, including module startup
and WebDriver observation). All scenarios reached countdown without unhandled
errors. Audio delayed by six seconds arrived after START while the game continued
in the playing state. No production leaderboard writes were used in these tests.
The final normal browser run passed both full 60-second rounds, including countdown
cue counts/spacing, scoring, end timing, Replay and leaderboard form behavior,
with zero failed checks and zero unhandled JavaScript errors.
