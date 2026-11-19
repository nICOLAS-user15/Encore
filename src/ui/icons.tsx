import type { SVGProps } from 'react'

/*
 * Ícones desenhados à mão: traço grosso, pontas retas (square/miter),
 * combinando com as bordas duras do design system. Sem biblioteca externa.
 */
type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Barra com anilhas: aba Treino. */
export function BarbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 12h20M5 8v8M8 6v12M16 6v12M19 8v8" />
    </Icon>
  )
}

/** Lista: aba Rotinas. */
export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6h12M9 12h12M9 18h12M4 6h1M4 12h1M4 18h1" />
    </Icon>
  )
}

/**
 * Halter na diagonal: aba Exercícios. A pegada vai de canto a canto e cada
 * ponta tem duas anilhas (a de dentro maior), perpendiculares à pegada.
 */
export function DumbbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 18.5l13-13" />
      <path d="M6 12l6 6M12 6l6 6" />
      <path d="M4.5 15.5l4 4M15.5 4.5l4 4" />
    </Icon>
  )
}

/** Calendário: aba Histórico. */
export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18v15H3zM3 11h18M8 3v4M16 3v4" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

/** Três pontos (quadradinhos, no estilo reto): "mais opções". */
export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  )
}

/** Três barras: abrir o menu lateral. */
export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Icon>
  )
}

/**
 * Engrenagem: configurações. Anel + furo no centro + 8 dentes; as pontas
 * quadradas do traço (strokeLinecap="square") fazem os dentes ficarem retos.
 */
export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.5" />
      {/* Dentes: 4 nos eixos (cima, baixo, esquerda, direita) e 4 nas diagonais. */}
      <path d="M12 5V2.5M12 19v2.5M5 12H2.5M19 12h2.5" />
      <path d="M16.95 7.05l1.75-1.75M7.05 7.05L5.3 5.3M16.95 16.95l1.75 1.75M7.05 16.95L5.3 18.7" />
    </Icon>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12H5M11 5l-7 7 7 7" />
    </Icon>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h15M13 5l7 7-7 7" />
    </Icon>
  )
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20V5M5 11l7-7 7 7" />
    </Icon>
  )
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v15M5 13l7 7 7-7" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Icon>
  )
}

/** "i" dentro de um quadrado: sobre o app. */
export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3h18v18H3zM12 10v7M12 7v.01" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12l5 5L20 6" />
    </Icon>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}
