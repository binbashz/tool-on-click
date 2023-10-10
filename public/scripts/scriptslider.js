// texto del slider

let slideIndex = 0;

function showSlide(index) {
    const slides = document.querySelectorAll('.slider-item');
    
    if (index >= slides.length) {
        slideIndex = 0;
    } else if (index < 0) {
        slideIndex = slides.length - 1;
    }

    slides.forEach((slide, i) => {
        if (i === slideIndex) {
            slide.style.display = 'block';
        } else {
            slide.style.display = 'none';
        }
    });
}

function nextSlide() {
    slideIndex++;
    showSlide(slideIndex);
}

function prevSlide() {
    slideIndex--;
    showSlide(slideIndex);
}

// Iniciar slider automáticamente
setInterval(nextSlide, 2000); // Cambiar cada 2 segundos

// Mostrar el primer slide al cargar la página
showSlide(slideIndex);
