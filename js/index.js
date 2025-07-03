window.addEventListener("DOMContentLoaded", () => {
	const lottie = document.getElementById("introFX");

	setTimeout(() => {
		lottie.style.display = "flex";
		lottie.play();
	}, 400);

	setTimeout(() => {
		const title = document.querySelector(".hero-text h1");

		if (title) {
			title.style.display = "flex";
			title.classList.add("glitch");
			PowerGlitch.glitch(".glitch", {
			"timing": {
				"duration": 200,
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
	}, 600),
	
	setTimeout(() => {
		lottie.style.display = "none";
		lottie.stop();
	}, 1200);
});