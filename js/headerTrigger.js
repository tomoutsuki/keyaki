const header = document.querySelector("header");
const heroBanner = document.querySelector(".hero-banner");

window.addEventListener("scroll", () => {
	const triggerPoint = heroBanner.offsetHeight / 1.5;

	if (window.scrollY > triggerPoint) {
		header.classList.add("visible");
		return;
	}
	header.classList.remove("visible");
});