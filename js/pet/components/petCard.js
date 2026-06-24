export function createPetCard() {
  const card = document.createElement("section");
  card.className = "pet-card";
  card.setAttribute("aria-label", "Euno, your wellness companion");

  const stage = document.createElement("div");
  stage.className = "pet-card__stage";

  const ring = document.createElement("div");
  ring.className = "pet-card__ring";
  ring.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.className = "pet-card__image";
  image.alt = "Euno, your wellness companion";
  image.width = 256;
  image.height = 256;
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "high";

  stage.append(ring, image);
  card.appendChild(stage);

  function update({ src, isReflecting }) {
    if (src && image.getAttribute("src") !== src) {
      // Preload image to avoid white flash during src change
      const preloadImg = new Image();
      preloadImg.onload = () => {
        image.src = src;
      };
      preloadImg.onerror = () => {
        // Fallback: set src even if preload fails
        image.src = src;
      };
      preloadImg.src = src;
    }
    card.classList.toggle("is-reflecting", Boolean(isReflecting));
  }

  return { element: card, update };
}
