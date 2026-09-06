export default function LogoMark({ className = "" }) {
    return (
        <svg
            viewBox="0 0 40 40"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <circle cx="13" cy="27" r="4.5" fill="#3A36E0" />
            <path
                d="M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5"
                stroke="#3A36E0"
                strokeWidth="3.2"
                strokeLinecap="round"
            />
            <path
                d="M19.5 33.5C19.5 23.2827 27.7827 15 38 15"
                stroke="#FF8A34"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.5"
            />
        </svg>
    );
}
