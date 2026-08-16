 const track = document.getElementById('track');
 const slides = track;
 const dotsContainer = document.getElementById('dots');
 let current = 0;
 let autoSlide;

 // build dots
 for (let i = 0; i < slides.length; i++) {
     const dot = document.createElement('button');
     dot.classList.add('dot');
     if (i === 0) dot.classList.add('active');
     dot.addEventListener('click', () => goTo(i));
     dotsContainer.appendChild(dot);
 }

 function updateDots() {
     document.querySelectorAll('.dot').forEach((d, i) => {
         d.classList.toggle('active', i === current);
     });
 }

 function goTo(index) {
     current = (index + slides.length) % slides.length;
     track.style.transform = `translateX(-${current * 100}%)`;
     updateDots();
 }

 function nextSlide() { goTo(current + 1); }

 function prevSlide() { goTo(current - 1); }

 function startAuto() {
     autoSlide = setInterval(nextSlide, 4000);
 }

 function stopAuto() {
     clearInterval(autoSlide);
 }

 startAuto();

 const banner = document.querySelector('.banner');
 banner.addEventListener('mouseenter', stopAuto);
 banner.addEventListener('mouseleave', startAuto); // ---- Count-up animation for stats ----
 function animateCount(el, target, duration = 1600) {
     const start = performance.now();
     const startVal = 0;

     function tick(now) {
         const elapsed = now - start;
         const progress = Math.min(elapsed / duration, 1);
         // ease-out for a nice deceleration
         const eased = 1 - Math.pow(1 - progress, 3);
         const current = Math.floor(startVal + (target - startVal) * eased);
         el.textContent = current.toLocaleString() + '+';

         if (progress < 1) {
             requestAnimationFrame(tick);
         } else {
             el.textContent = target.toLocaleString() + '+';
         }
     }
     requestAnimationFrame(tick);
 }

 const statEls = document.querySelectorAll('.stat-card .num');
 let counted = false;

 function triggerCountIfVisible() {
     if (counted) return;
     const statsSection = document.querySelector('.stats');
     const rect = statsSection.getBoundingClientRect();
     if (rect.top < window.innerHeight * 0.85) {
         counted = true;
         statEls.forEach(el => animateCount(el, parseInt(el.dataset.target, 10)));
         window.removeEventListener('scroll', triggerCountIfVisible);
     }
 }

 window.addEventListener('scroll', triggerCountIfVisible);
 window.addEventListener('load', triggerCountIfVisible);