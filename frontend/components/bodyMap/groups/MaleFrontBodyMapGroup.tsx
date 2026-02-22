import * as React from "react";
import { MaleFrontBodyMapGroupPart1 } from "./maleFront/MaleFrontBodyMapGroupPart1";
import { MaleFrontBodyMapGroupPart2 } from "./maleFront/MaleFrontBodyMapGroupPart2";
import { useBodyMapWarp, BodyWarpParams } from "../../../hooks/useBodyMapWarp";
import { BodyMapStrokeConfig } from "../../../config/bodyMapWarp";

const BASE_VIEWBOX_WIDTH = 660.46;
const BASE_VIEWBOX_HEIGHT = 1206.46;

interface Props extends React.SVGProps<SVGSVGElement> {
  warpOverrides?: BodyWarpParams;
  stroke?: Partial<BodyMapStrokeConfig>;
}

const SVGComponent = React.forwardRef<SVGSVGElement, Props>(({ warpOverrides, stroke, ...props }, forwardedRef) => {
  const { ref, heightScale, ready } = useBodyMapWarp({ gender: 'male', overrides: warpOverrides, stroke });

  React.useImperativeHandle(forwardedRef, () => ref.current!);

  const scaledHeight = BASE_VIEWBOX_HEIGHT * heightScale;
  const yOffset = (scaledHeight - BASE_VIEWBOX_HEIGHT) / 2;
  const viewBox = `0 ${-yOffset} ${BASE_VIEWBOX_WIDTH} ${scaledHeight}`;

  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-80 col-span-2"
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      {...props}
    >
      <MaleFrontBodyMapGroupPart1 />
      <MaleFrontBodyMapGroupPart2 />
    </svg>
  );
});

SVGComponent.displayName = "MaleFrontBodyMapGroup";

export default SVGComponent;
