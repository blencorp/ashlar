export function renderGovernmentFlag(): string {
  return `
    <svg
      class="flag"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 11"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="16" height="11" fill="#ffffff"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="0" fill="#b31942"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="1.692" fill="#b31942"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="3.384" fill="#b31942"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="5.076" fill="#b31942"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="6.768" fill="#b31942"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="8.46" fill="#b31942"></rect>
      <rect data-flag-stripe width="16" height="0.846" y="10.152" fill="#b31942"></rect>
      <rect data-flag-canton width="6.4" height="5.923" fill="#005ea8"></rect>
      <g fill="#ffffff">
        <circle data-flag-star cx="0.55" cy="0.55" r="0.12"></circle>
        <circle data-flag-star cx="1.75" cy="0.55" r="0.12"></circle>
        <circle data-flag-star cx="2.95" cy="0.55" r="0.12"></circle>
        <circle data-flag-star cx="4.15" cy="0.55" r="0.12"></circle>
        <circle data-flag-star cx="5.35" cy="0.55" r="0.12"></circle>
        <circle data-flag-star cx="1.15" cy="1.45" r="0.12"></circle>
        <circle data-flag-star cx="2.35" cy="1.45" r="0.12"></circle>
        <circle data-flag-star cx="3.55" cy="1.45" r="0.12"></circle>
        <circle data-flag-star cx="4.75" cy="1.45" r="0.12"></circle>
        <circle data-flag-star cx="0.55" cy="2.35" r="0.12"></circle>
        <circle data-flag-star cx="1.75" cy="2.35" r="0.12"></circle>
        <circle data-flag-star cx="2.95" cy="2.35" r="0.12"></circle>
        <circle data-flag-star cx="4.15" cy="2.35" r="0.12"></circle>
        <circle data-flag-star cx="5.35" cy="2.35" r="0.12"></circle>
        <circle data-flag-star cx="1.15" cy="3.25" r="0.12"></circle>
        <circle data-flag-star cx="2.35" cy="3.25" r="0.12"></circle>
        <circle data-flag-star cx="3.55" cy="3.25" r="0.12"></circle>
        <circle data-flag-star cx="4.75" cy="3.25" r="0.12"></circle>
      </g>
    </svg>
  `;
}
