import { FunctionComponent, useMemo } from "react";
import Plot from "react-plotly.js";

interface PlotlyPlotProps {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
}

const PlotlyPlot: FunctionComponent<PlotlyPlotProps> = ({
  data,
  layout,
  config,
}) => {
  // for some reason, we need to make a copy of the data, otherwise the plot is empty

  const dataCopy = useMemo(() => JSON.parse(JSON.stringify(data)), [data]);
  const layoutCopy = useMemo(
    () => JSON.parse(JSON.stringify(layout)),
    [layout],
  );

  return <Plot data={dataCopy} layout={layoutCopy} config={config} />;
};

export default PlotlyPlot;
