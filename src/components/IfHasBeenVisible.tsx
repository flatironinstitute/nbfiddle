import { FunctionComponent, PropsWithChildren, useRef } from "react";
import { useInView } from "react-intersection-observer";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {};

const IfHasBeenVisible: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
}) => {
  const hasBeenVisible = useRef(false);
  const { inView, ref } = useInView({ trackVisibility: true, delay: 500 });
  if (inView) hasBeenVisible.current = true;
  const doDisplay = inView || hasBeenVisible.current;
  return (
    <div
      ref={ref}
      style={{
        position: !doDisplay ? "relative" : undefined,
        width: !doDisplay ? 30 : undefined,
        height: !doDisplay ? 30 : undefined,
      }}
    >
      {doDisplay ? children : <span>.</span>}
    </div>
  );
};

export default IfHasBeenVisible;
