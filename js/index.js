const RELEASES_URL = "./data/releases.json";

const PLATFORM_DETAILS = {
	amazon: {
		label: "Amazon Music",
		icon: "./assets/icons/amazon.svg",
	},
	deezer: {
		label: "Deezer",
		icon: "./assets/icons/deezer.png",
	},
	soundcloud: {
		label: "SoundCloud",
		icon: "./assets/icons/soundcloud.svg",
	},
	spotify: {
		label: "Spotify",
		icon: "./assets/icons/spotify.svg",
	},
	tidal: {
		label: "TIDAL",
		icon: "./assets/icons/tidal.svg",
	},
	youtube: {
		label: "YouTube",
		icon: "./assets/icons/youtube.svg",
	},
	youtubeMusic: {
		label: "YouTube Music",
		icon: "./assets/icons/youtube-music.svg",
	},
};

window.addEventListener("DOMContentLoaded", () => {
	startHeroIntro();
	initReleaseCarousel();
});

function startHeroIntro() {
	const introStage = document.querySelector(".intro-stage");
	const heroBanner = document.querySelector(".hero-banner");
	const heroLogo = document.querySelector(".hero-logo");

	setTimeout(() => {
		const title = document.querySelector(".hero-text h1");

		if (!title) {
			return;
		}

		title.style.display = "flex";
		title.classList.add("glitch");

		if (window.PowerGlitch) {
			window.PowerGlitch.glitch(".glitch", {
				timing: {
					duration: 300,
					iterations: 1,
				},
				glitchTimeSpan: {
					start: 0,
					end: 1,
				},
				slice: {
					count: 2,
					velocity: 10,
					minHeight: 0.05,
					maxHeight: 0.30,
				},
			});
		}
	}, 600);

	setTimeout(() => {
		introStage?.classList.add("is-fading");
		heroBanner?.classList.add("is-revealed");
		heroLogo?.classList.add("is-visible");
	}, 2400);

	setTimeout(() => {
		if (introStage) {
			introStage.classList.add("is-hidden");
			introStage.setAttribute("aria-hidden", "true");
		}

		heroBanner?.classList.add("is-content-visible");
	}, 3000);
}

async function initReleaseCarousel() {
	const carousel = document.querySelector(".release-carousel");
	const track = carousel?.querySelector(".carousel-track");
	const previousButton = carousel?.querySelector(".carousel-prev");
	const nextButton = carousel?.querySelector(".carousel-next");
	const dotsContainer = carousel?.querySelector(".carousel-dots");
	const platformLinks = carousel?.querySelector(".release-platform-links");
	const currentCount = document.querySelector(".release-count span");
	const totalCount = document.querySelector(".release-count b");

	if (!carousel || !track || !previousButton || !nextButton || !dotsContainer || !platformLinks) {
		return;
	}

	try {
		const response = await fetch(RELEASES_URL);

		if (!response.ok) {
			throw new Error(`Release data request failed with status ${response.status}`);
		}

		const data = await response.json();
		const releases = Array.isArray(data) ? data.filter(isValidRelease) : [];

		if (!releases.length) {
			throw new Error("No valid releases were found in the release data");
		}

		buildCarousel(releases, {
			carousel,
			track,
			previousButton,
			nextButton,
			dotsContainer,
			platformLinks,
			currentCount,
			totalCount,
		});
	} catch (error) {
		console.error("Unable to initialize the release carousel:", error);
		showReleaseError(carousel, track, platformLinks);
	}
}

function isValidRelease(release) {
	return Boolean(
		release
		&& typeof release.title === "string"
		&& release.title.trim()
		&& typeof release.youtubeEmbedUrl === "string"
		&& release.youtubeEmbedUrl.trim()
		&& Array.isArray(release.distributionLinks),
	);
}

function buildCarousel(releases, elements) {
	const {
		carousel,
		track,
		previousButton,
		nextButton,
		dotsContainer,
		platformLinks,
		currentCount,
		totalCount,
	} = elements;
	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let activeIndex = 0;
	let touchStartX = 0;
	let platformTimer;

	const slides = releases.map((release, index) => createReleaseSlide(release, index, releases.length));
	track.replaceChildren(...slides);

	const dots = releases.map((release, index) => {
		const dot = document.createElement("button");
		dot.className = "carousel-dot";
		dot.type = "button";
		dot.setAttribute("aria-label", `Show ${release.title}, release ${index + 1} of ${releases.length}`);
		dot.addEventListener("click", () => showSlide(index));
		return dot;
	});
	dotsContainer.replaceChildren(...dots);

	if (totalCount) {
		totalCount.textContent = String(releases.length).padStart(2, "0");
	}

	previousButton.disabled = releases.length < 2;
	nextButton.disabled = releases.length < 2;
	carousel.setAttribute("aria-busy", "false");

	function renderPlatformLinks(release, immediate = false) {
		window.clearTimeout(platformTimer);

		const render = () => {
			const links = release.distributionLinks
				.map((link) => createPlatformLink(link, release.title))
				.filter(Boolean);

			if (links.length) {
				platformLinks.replaceChildren(...links);
			} else {
				const status = document.createElement("span");
				status.className = "platform-status";
				status.textContent = "Distribution links coming soon";
				platformLinks.replaceChildren(status);
			}

			requestAnimationFrame(() => platformLinks.classList.remove("is-changing"));
		};

		if (immediate || prefersReducedMotion) {
			render();
			return;
		}

		platformLinks.classList.add("is-changing");
		platformTimer = window.setTimeout(render, 180);
	}

	function showSlide(index, immediate = false) {
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

		if (currentCount) {
			currentCount.textContent = String(activeIndex + 1).padStart(2, "0");
		}

		renderPlatformLinks(releases[activeIndex], immediate);
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

	showSlide(0, true);
}

function createReleaseSlide(release, index, total) {
	const slide = document.createElement("article");
	const videoFrame = document.createElement("div");
	const iframe = document.createElement("iframe");
	const title = document.createElement("p");
	const number = document.createElement("span");

	slide.className = "release-slide";
	slide.setAttribute("aria-label", `${release.title}, ${index + 1} of ${total}`);
	slide.setAttribute("aria-roledescription", "slide");
	videoFrame.className = "video-frame";
	iframe.src = release.youtubeEmbedUrl;
	iframe.title = `Keyaki — ${release.title}`;
	iframe.loading = index === 0 ? "eager" : "lazy";
	iframe.referrerPolicy = "strict-origin-when-cross-origin";
	iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
	iframe.allowFullscreen = true;
	number.textContent = String(index + 1).padStart(2, "0");
	title.append(number, document.createTextNode(release.title));
	videoFrame.append(iframe);
	slide.append(videoFrame, title);

	return slide;
}

function createPlatformLink(link, releaseTitle) {
	const details = PLATFORM_DETAILS[link?.platform];

	if (!details || typeof link.url !== "string" || !link.url.trim()) {
		return null;
	}

	const anchor = document.createElement("a");
	const icon = document.createElement("img");
	anchor.href = link.url;
	anchor.target = "_blank";
	anchor.rel = "noopener noreferrer";
	anchor.setAttribute("aria-label", `Find ${releaseTitle} on ${details.label}`);
	anchor.title = details.label;
	icon.src = details.icon;
	icon.alt = "";
	icon.setAttribute("aria-hidden", "true");
	anchor.append(icon);

	return anchor;
}

function showReleaseError(carousel, track, platformLinks) {
	const message = document.createElement("p");
	const platformStatus = document.createElement("span");
	message.className = "carousel-status is-error";
	message.textContent = "The releases could not be loaded. Please try again shortly.";
	platformStatus.className = "platform-status";
	platformStatus.textContent = "Unavailable";
	track.replaceChildren(message);
	platformLinks.replaceChildren(platformStatus);
	carousel.setAttribute("aria-busy", "false");
}
