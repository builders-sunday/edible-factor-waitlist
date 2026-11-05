/* Plays a reel clip once each time it comes on screen, then returns to the
   still. Clips are under 5 s and never loop: motion nudges the eye and stops.
   External file, not inline, so it works under any script-src policy.
   Nothing is fetched until a clip is in view. Reduced motion and Save-Data
   readers keep the still, which carries the same fact as the clip. */
(function () {
  'use strict';

  var clips = Array.prototype.slice.call(document.querySelectorAll('video[data-src]'));
  if (!clips.length || !('IntersectionObserver' in window)) return;

  var connection = navigator.connection;
  if (connection && connection.saveData) return;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  function play(video) {
    if (calm.matches) return;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    var started = video.play();
    // iOS Low Power Mode refuses autoplay. The still stays, which is fine.
    if (started && started.catch) started.catch(function () {});
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) play(entry.target);
      else entry.target.pause();
    });
  }, { threshold: 0.6 });

  clips.forEach(function (video) {
    // The still shows until real frames arrive, so a slow load never shows a gap.
    video.addEventListener('playing', function () { video.classList.add('is-live'); });
    video.addEventListener('ended', function () { video.classList.remove('is-live'); });
    observer.observe(video);
  });
})();
