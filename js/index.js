const RELEASES_URL = "./data/releases.json";
const BASS_MAP_URL = "./data/iracema_bassMap.csv";
const MAX_BASS_LEVEL = 15;

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

window.addEventListener("DOMContentLoaded", async () => {
	initHeroPlayer();
	initReleaseCarousel();

	await waitForSiteFonts().catch((error) => console.warn("Unable to confirm site fonts:", error));
	revealSite();
	startHeroIntro();
	startSectionGlitches();
});

async function waitForSiteFonts() {
	if (!document.fonts) {
		return;
	}

	await Promise.allSettled([
		document.fonts.load('400 1em "Bruno Ace SC"'),
		document.fonts.load('400 1em "Unica One"'),
		document.fonts.load('400 1em "Open Sans"'),
		document.fonts.ready,
	]);
}

function revealSite() {
	const loader = document.querySelector(".font-loader");
	document.body.classList.remove("fonts-loading");
	loader?.setAttribute("aria-hidden", "true");
}

function initHeroPlayer() {
	const heroBanner = document.querySelector(".hero-banner");
	const iframe = document.querySelector("#soundcloud-player");
	const apiScript = document.querySelector("#soundcloud-widget-api");
	const player = document.querySelector(".hero-player");
	const playerBody = document.querySelector(".hero-player-body");
	const toggleButton = document.querySelector(".hero-player-toggle");
	const status = document.querySelector(".hero-player-status");
	const waveCanvas = document.querySelector(".hero-wave");
	const seekInput = document.querySelector(".hero-player-seek");
	const currentTime = document.querySelector(".hero-player-current");
	const durationTime = document.querySelector(".hero-player-duration");
	const volumeInput = document.querySelector(".hero-player-volume");
	const volumeOutput = document.querySelector(".hero-player-volume-output");

	if (
		!heroBanner || !iframe || !player || !playerBody || !toggleButton || !status || !waveCanvas
		|| !seekInput || !currentTime || !durationTime || !volumeInput || !volumeOutput
	) {
		return;
	}

	const wave = createHeroWave(waveCanvas);
	let widget;
	let widgetReady = false;
	let isPlaying = false;
	let connected = false;
	let isScrubbing = false;
	let trackDuration = Number(seekInput.max);
	const apiTimeout = window.setTimeout(() => {
		if (!connected) {
			markUnavailable();
		}
	}, 12000);

	loadBassMap()
		.then((volumeMap) => wave.setVolumeMap(volumeMap))
		.catch((error) => console.warn("Unable to load the Iracema bass map:", error));
	syncPosition(0, true);
	setVolumeDisplay(Number(volumeInput.value));

	function formatTime(milliseconds) {
		const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = String(totalSeconds % 60).padStart(2, "0");
		return `${minutes}:${seconds}`;
	}

	function updateRangeFill(input) {
		const minimum = Number(input.min) || 0;
		const maximum = Number(input.max) || 1;
		const value = Number(input.value) || 0;
		const progress = ((value - minimum) / Math.max(1, maximum - minimum)) * 100;
		input.style.setProperty("--range-progress", `${Math.max(0, Math.min(100, progress))}%`);
	}

	function syncPosition(position, forceControl = false) {
		if (!Number.isFinite(position) || (isScrubbing && !forceControl)) {
			return;
		}

		const maximum = trackDuration || Number(seekInput.max);
		const clampedPosition = Math.max(0, Math.min(maximum, position));
		wave.setPosition(clampedPosition);
		seekInput.value = String(clampedPosition);
		seekInput.setAttribute("aria-valuetext", formatTime(clampedPosition));
		currentTime.value = formatTime(clampedPosition);
		updateRangeFill(seekInput);
	}

	function setVolumeDisplay(volume) {
		const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));
		volumeInput.value = String(clampedVolume);
		volumeInput.setAttribute("aria-valuetext", `${clampedVolume}%`);
		volumeOutput.value = String(clampedVolume);
		updateRangeFill(volumeInput);
	}

	function expandPlayer() {
		player.classList.add("is-expanded");
		playerBody.setAttribute("aria-hidden", "false");
	}

	function setPlayingState(playing) {
		if (playing) {
			expandPlayer();
		}

		isPlaying = playing;
		toggleButton.classList.toggle("is-playing", playing);
		toggleButton.setAttribute("aria-pressed", String(playing));
		toggleButton.setAttribute("aria-label", `${playing ? "Pause" : "Play"} Iracema`);
		status.textContent = playing ? "Now playing" : "Ready to play";
		heroBanner.classList.toggle("is-audio-playing", playing);
		wave.setPlaying(playing);
	}

	function updatePosition(event) {
		if (Number.isFinite(event?.currentPosition)) {
			syncPosition(event.currentPosition);
		}
	}

	function markUnavailable() {
		widgetReady = false;
		setPlayingState(false);
		toggleButton.disabled = true;
		seekInput.disabled = true;
		volumeInput.disabled = true;
		status.textContent = "Audio unavailable";
	}

	function connectWidget() {
		if (connected || !window.SC?.Widget) {
			return;
		}

		connected = true;
		window.clearTimeout(apiTimeout);
		widget = window.SC.Widget(iframe);
		const events = window.SC.Widget.Events;

		widget.bind(events.READY, () => {
			widgetReady = true;
			syncPosition(0, true);
			toggleButton.disabled = false;
			seekInput.disabled = false;
			volumeInput.disabled = false;
			status.textContent = "Ready to play";

			widget.getDuration((duration) => {
				if (!Number.isFinite(duration) || duration <= 0) {
					return;
				}

				trackDuration = duration;
				seekInput.max = String(duration);
				durationTime.textContent = formatTime(duration);
				syncPosition(0, true);
			});
			widget.getVolume((volume) => {
				if (Number.isFinite(volume)) {
					setVolumeDisplay(volume);
				}
			});
		});

		widget.bind(events.PLAY, () => {
			setPlayingState(true);
			widget.getPosition((position) => syncPosition(position));
		});
		widget.bind(events.PLAY_PROGRESS, updatePosition);
		widget.bind(events.SEEK, updatePosition);
		widget.bind(events.PAUSE, () => {
			setPlayingState(false);
			widget.getPosition((position) => syncPosition(position));
		});
		widget.bind(events.FINISH, () => {
			setPlayingState(false);
			syncPosition(0, true);
		});
		widget.bind(events.ERROR, markUnavailable);
	}

	toggleButton.addEventListener("click", () => {
		if (!widgetReady || !widget) {
			return;
		}

		if (isPlaying) {
			widget.pause();
		} else {
			expandPlayer();
			widget.play();
		}
	});

	seekInput.addEventListener("input", () => {
		isScrubbing = true;
		syncPosition(Number(seekInput.value), true);
	});

	seekInput.addEventListener("change", () => {
		if (!widgetReady || !widget) {
			return;
		}

		const position = Number(seekInput.value);
		isScrubbing = false;
		widget.seekTo(position);
		syncPosition(position, true);
	});

	seekInput.addEventListener("pointercancel", () => {
		isScrubbing = false;
		widget?.getPosition((position) => syncPosition(position, true));
	});

	volumeInput.addEventListener("input", () => {
		const volume = Number(volumeInput.value);
		setVolumeDisplay(volume);

		if (widgetReady && widget) {
			widget.setVolume(volume);
		}
	});

	if (window.SC?.Widget) {
		connectWidget();
	} else {
		apiScript?.addEventListener("load", connectWidget, { once: true });
		apiScript?.addEventListener("error", markUnavailable, { once: true });
	}
}

async function loadBassMap() {
	const response = await fetch(BASS_MAP_URL);

	if (!response.ok) {
		throw new Error(`Bass map request failed with status ${response.status}`);
	}

	return (await response.text())
		.trim()
		.split(/\r?\n/)
		.slice(1)
		.map((row) => {
			const [startMs, level] = row.split(",").map(Number);
			return { startMs, level };
		})
		.filter(({ startMs, level }) => Number.isFinite(startMs) && Number.isFinite(level))
		.sort((a, b) => a.startMs - b.startMs);
}

function createHeroWave(canvas) {
	const context = canvas.getContext("2d");
	const volumeTransitionMs = 100;
	const waveFunctions = [
		{ cycles: 1.7, amplitude: 1, opacity: 0.82, offset: 0 },
		{ cycles: 2.35, amplitude: 0.68, opacity: 0.5, offset: Math.PI / 3 },
		{ cycles: 3.1, amplitude: 0.43, opacity: 0.34, offset: Math.PI * 0.72 },
	];
	let volumeMap = [{ startMs: 0, level: 0 }];
	let basePosition = 0;
	let positionUpdatedAt = performance.now();
	let currentLevel = 0;
	let playing = false;
	let horizontalOffset = 0;
	let animationFrame = 0;
	let previousFrame = performance.now();
	let width = 0;
	let height = 0;

	function resize() {
		const bounds = canvas.getBoundingClientRect();
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		width = Math.max(1, bounds.width);
		height = Math.max(1, bounds.height);
		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

		if (playing) {
			draw();
		}
	}

	function getVolumeLevel(position) {
		let low = 0;
		let high = volumeMap.length - 1;
		let match = 0;

		while (low <= high) {
			const middle = Math.floor((low + high) / 2);

			if (volumeMap[middle].startMs <= position) {
				match = middle;
				low = middle + 1;
			} else {
				high = middle - 1;
			}
		}

		const currentChange = volumeMap[match];
		const previousLevel = volumeMap[match - 1]?.level ?? currentChange.level;
		const transitionProgress = Math.max(
			0,
			Math.min(1, (position - currentChange.startMs) / volumeTransitionMs),
		);
		const easedProgress = transitionProgress * transitionProgress * (3 - (2 * transitionProgress));
		const interpolatedLevel = previousLevel
			+ ((currentChange.level - previousLevel) * easedProgress);

		return Math.max(0, Math.min(MAX_BASS_LEVEL, interpolatedLevel));
	}

	function getPosition(now) {
		return basePosition + (playing ? now - positionUpdatedAt : 0);
	}

	function draw() {
		context.clearRect(0, 0, width, height);

		const centerY = height / 2;
		const volumeRatio = currentLevel / MAX_BASS_LEVEL;
		const minimumAmplitude = 5;
		const maximumAmplitude = Math.max(minimumAmplitude, (height / 2) - 2);
		const amplitude = minimumAmplitude
			+ (volumeRatio * (maximumAmplitude - minimumAmplitude));
		const gradient = context.createLinearGradient(0, 0, width, 0);
		gradient.addColorStop(0, "rgba(105, 174, 252, 0)");
		gradient.addColorStop(0.16, "rgba(105, 174, 252, 0.9)");
		gradient.addColorStop(0.5, "rgba(244, 247, 247, 0.95)");
		gradient.addColorStop(0.84, "rgba(169, 248, 145, 0.82)");
		gradient.addColorStop(1, "rgba(169, 248, 145, 0)");
		context.strokeStyle = gradient;
		context.lineWidth = 1.5;
		context.globalCompositeOperation = "lighter";

		waveFunctions.forEach((waveFunction) => {
			context.beginPath();
			context.globalAlpha = waveFunction.opacity;

			for (let x = 0; x <= width; x += 3) {
				const angle = (((x / width) - horizontalOffset) * Math.PI * 2 * waveFunction.cycles)
					+ waveFunction.offset;
				const y = centerY + (Math.sin(angle) * amplitude * waveFunction.amplitude);

				if (x === 0) {
					context.moveTo(x, y);
				} else {
					context.lineTo(x, y);
				}
			}

			context.stroke();
		});

		context.globalAlpha = 1;
		context.globalCompositeOperation = "source-over";
	}

	function animate(now) {
		if (!playing) {
			return;
		}

		const elapsedSeconds = Math.min((now - previousFrame) / 1000, 0.05);
		currentLevel = getVolumeLevel(getPosition(now));
		const volumeRatio = currentLevel / MAX_BASS_LEVEL;
		const travelSpeed = 0.22 + (volumeRatio * 1.20);
		horizontalOffset += elapsedSeconds * travelSpeed;
		previousFrame = now;
		draw();
		animationFrame = window.requestAnimationFrame(animate);
	}

	resize();

	if (window.ResizeObserver) {
		new ResizeObserver(resize).observe(canvas);
	} else {
		window.addEventListener("resize", resize);
	}

	return {
		setVolumeMap(nextVolumeMap) {
			if (nextVolumeMap.length) {
				volumeMap = nextVolumeMap;
			}
		},
		setPosition(position) {
			if (!Number.isFinite(position)) {
				return;
			}

			basePosition = position;
			positionUpdatedAt = performance.now();
		},
		setPlaying(nextPlaying) {
			playing = nextPlaying;
			window.cancelAnimationFrame(animationFrame);
			positionUpdatedAt = performance.now();

			if (!playing) {
				return;
			}

			currentLevel = getVolumeLevel(basePosition);
			previousFrame = performance.now();

			animationFrame = window.requestAnimationFrame(animate);
		},
	};
}

function startSectionGlitches() {
	if (!window.PowerGlitch) {
		return;
	}

	const repeatingGlitchOptions = {
		playMode: "always",
		timing: {
			duration: 3500,
			iterations: Infinity,
		},
		glitchTimeSpan: {
			start: 0,
			end: 0.1,
		},
		shake: {
			velocity: 1,
			amplitudeX: 0.05,
			amplitudeY: 0.05,
		},
		slice: {
			count: 1,
			velocity: 5,
			minHeight: 0.05,
			maxHeight: 0.30,
			hueRotate: false,
		},
		pulse: false,
	};

	// H2 Glitch Effect
	
	// window.PowerGlitch.glitch(
	// 	".about-text h2, .latest-release h2, .contact h2",
	// 	repeatingGlitchOptions,
	// );

	window.PowerGlitch.glitch(".about-image-glitch", {
		...repeatingGlitchOptions,
		createContainers: false,
		hideOverflow: true,
		shake: {
			velocity: 3,
			amplitudeX: 0.06,
			amplitudeY: 0.04,
		},
		slice: {
			count: 1,
			velocity: 6,
			minHeight: 0.10,
			maxHeight: 0.30,
			hueRotate: true,
		},
	});
}

function startHeroIntro() {
	const introStage = document.querySelector(".intro-stage");
	const heroBanner = document.querySelector(".hero-banner");
	const heroLogo = document.querySelector(".hero-logo");

	setTimeout(() => {
		const title = document.querySelector(".hero-intro");

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
