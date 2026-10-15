export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
}
export const GAMES: Game[] = [
  {
    id: "bloque-buster",
    title: "BLOQUE BUSTER",
    short: "Rebota la pelota y destruye muros de neón.",
    long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?",
    cat: "ARCADE",
    cover: "cover-bricks",
    color: "cyan",
  },
  {
    id: "caida",
    title: "CAÍDA",
    short: "Encaja las piezas antes de que el techo te aplaste.",
    long: "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.",
    cat: "PUZZLE",
    cover: "cover-tetro",
    color: "magenta",
  },
  {
    id: "snake",
    title: "SNAKE",
    short: "Come fruta, crece y no muerdas tu cola.",
    long: "Una serpiente de luz recorre la rejilla sin detenerse. Cada fruta suma puntos y la alarga, y cada cinco subes de nivel y ganas velocidad. Un choque contra la pared o contra tu propia cola termina la partida.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
  },
  {
    id: "gloton",
    title: "GLOTÓN",
    short: "Devora puntos y escapa de los fantasmas.",
    long: "Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.",
    cat: "ARCADE",
    cover: "cover-glot",
    color: "yellow",
  },
  {
    id: "invasores",
    title: "INVASORES",
    short: "Defiende el planeta de filas alienígenas.",
    long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
    cat: "SHOOTER",
    cover: "cover-invaders",
    color: "green",
  },
  {
    id: "rocas",
    title: "ROCAS",
    short: "Pulveriza asteroides en gravedad cero.",
    long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.",
    cat: "SHOOTER",
    cover: "cover-rocas",
    color: "yellow",
  },
  {
    id: "asteroides",
    title: "ASTEROIDES",
    short: "Esquiva, dispara y despeja el campo de rocas.",
    long: "Gira, propulsa y dispara tu nave en un campo de asteroides sin bordes: lo que sale por un lado vuelve por el otro. Cada roca se parte en fragmentos más rápidos y un power-up de triple disparo puede salvarte la partida. Limpia el campo para subir de nivel.",
    cat: "SHOOTER",
    cover: "cover-asteroides",
    color: "cyan",
  },
  {
    id: "tetris",
    title: "TETRIS",
    short: "Encaja las piezas y limpia líneas sin llegar al techo.",
    long: "Ocho piezas caen sobre un pozo de diez columnas, incluida una tuerca con hueco que complica cada encaje. Rótalas, desliza y deja caer al instante, con la sombra de aterrizaje como guía. Cada diez líneas sube el nivel y la caída se acelera. Compite por el ranking.",
    cat: "PUZZLE",
    cover: "cover-tetris",
    color: "yellow",
  },
  {
    id: "arkanoid",
    title: "ARKANOID",
    short: "Rompe la pirámide de bloques con una sola pelota.",
    long: "Mueve la pala con las flechas o el ratón y no dejes caer la pelota. Cinco niveles de muros distintos, desde el rectángulo hasta el marco con cruz, y la pelota va más rápida en cada uno. Tienes tres vidas para limpiar los 208 bloques. Compite por el ranking.",
    cat: "ARCADE",
    cover: "cover-arkanoid",
    color: "magenta",
  },
  {
    id: "ranaria",
    title: "RANARIA",
    short: "Cruza la autopista de pixeles.",
    long: "Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.",
    cat: "ARCADE",
    cover: "cover-rana",
    color: "green",
  },
  {
    id: "duelo-pixel",
    title: "DUELO PIXEL",
    short: "Dos paletas. Una pelota. Reflejos máximos.",
    long: "El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.",
    cat: "VERSUS",
    cover: "cover-duelo",
    color: "cyan",
  },
];
export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
