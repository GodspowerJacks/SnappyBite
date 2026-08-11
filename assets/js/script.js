 const track = document.getElementById('track');
 const slides = track.children;
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
 banner.addEventListener('mouseleave', startAuto);