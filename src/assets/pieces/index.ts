import wk from "./wk.png";
import wp from "./wp.png";
import wr from "./wr.png";
import wb from "./wb.png";
import wn from "./wn.png";
import wq from "./wq.png";

import bk from "./bk.png";
import bp from "./bp.png";
import br from "./br.png";
import bb from "./bb.png";
import bn from "./bn.png";
import bq from "./bq.png";

export const WHITE_PIECES = {
  king: wk,
  queen: wq,
  bishop: wb,
  knight: wn,
  rook: wr,
  pawn: wp,
} as const;

export const BLACK_PIECES = {
  king: bk,
  queen: bq,
  bishop: bb,
  knight: bn,
  rook: br,
  pawn: bp,
} as const;
