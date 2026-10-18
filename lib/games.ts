export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER";
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
    id: "snake",
    title: "SNAKE",
    short: "Come fruta, crece y no muerdas tu cola.",
    long: "Una serpiente de luz recorre la rejilla sin detenerse. Cada fruta suma puntos y la alarga, y cada cinco subes de nivel y ganas velocidad. Un choque contra la pared o contra tu propia cola termina la partida.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
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
];
export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
];
