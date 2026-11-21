window.addEventListener("DOMContentLoaded", () => {
	const introStage = document.querySelector(".intro-stage");
	const heroBanner = document.querySelector(".hero-banner");
	const heroLogo = document.querySelector(".hero-logo");

	setTimeout(() => {
		const title = document.querySelector(".hero-text h1");

		if (title) {
			title.style.display = "flex";
			title.classList.add("glitch");
			PowerGlitch.glitch(".glitch", {
			"timing": {
				"duration": 300,
				"iterations": 1
			},
			"glitchTimeSpan": {
				"start": 0,
				"end": 1
			},
			"slice": {
				"count": 2,
				"velocity": 10,
				"minHeight": 0.05,
				"maxHeight": 0.30
			},
		});
		}
	}, 600);

	setTimeout(() => {
		if (introStage) {
			introStage.classList.add("is-fading");
		}
		if (heroBanner) {
			heroBanner.classList.add("is-revealed");
		}
		if (heroLogo) {
			heroLogo.classList.add("is-visible");
		}
	}, 2400);

	setTimeout(() => {
		if (introStage) {
			introStage.classList.add("is-hidden");
			introStage.setAttribute("aria-hidden", "true");
		}
		if (heroBanner) {
			heroBanner.classList.add("is-content-visible");
		}
	}, 3000);

	const carousel = document.querySelector(".release-carousel");
	const track = carousel ? carousel.querySelector(".carousel-track") : null;
	const slides = carousel ? Array.from(carousel.querySelectorAll(".release-slide")) : [];
	const previousButton = carousel ? carousel.querySelector(".carousel-prev") : null;
	const nextButton = carousel ? carousel.querySelector(".carousel-next") : null;
	const dotsContainer = carousel ? carousel.querySelector(".carousel-dots") : null;
	const count = document.querySelector(".release-count span");

	if (!carousel || !track || !slides.length || !previousButton || !nextButton || !dotsContainer) {
		return;
	}

	let activeIndex = 0;
	let touchStartX = 0;

	const dots = slides.map((slide, index) => {
		const dot = document.createElement("button");
		dot.className = "carousel-dot";
		dot.type = "button";
		dot.setAttribute("aria-label", `Show release ${index + 1} of ${slides.length}`);
		dot.addEventListener("click", () => showSlide(index));
		dotsContainer.append(dot);
		return dot;
	});

	function showSlide(index) {
		activeIndex = (index + slides.length) % slides.length;
		track.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;

		slides.forEach((slide, slideIndex) => {
			const isActive = slideIndex === activeIndex;
			slide.setAttribute("aria-hidden", String(!isActive));
			slide.querySelector("iframe").tabIndex = isActive ? 0 : -1;
		});

		dots.forEach((dot, dotIndex) => {
			const isActive = dotIndex === activeIndex;
			dot.classList.toggle("is-active", isActive);
			dot.setAttribute("aria-pressed", String(isActive));
		});

		if (count) {
			count.textContent = String(activeIndex + 1).padStart(2, "0");
		}
	}

	previousButton.addEventListener("click", () => showSlide(activeIndex - 1));
	nextButton.addEventListener("click", () => showSlide(activeIndex + 1));

	carousel.addEventListener("keydown", (event) => {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			showSlide(activeIndex - 1);
		}

		if (event.key === "ArrowRight") {
			event.preventDefault();
			showSlide(activeIndex + 1);
		}
	});

	carousel.addEventListener("touchstart", (event) => {
		touchStartX = event.changedTouches[0].clientX;
	}, { passive: true });

	carousel.addEventListener("touchend", (event) => {
		const distance = touchStartX - event.changedTouches[0].clientX;

		if (Math.abs(distance) > 55) {
			showSlide(activeIndex + (distance > 0 ? 1 : -1));
		}
	}, { passive: true });

	showSlide(0);
});
