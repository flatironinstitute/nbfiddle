import { FunctionComponent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Box } from "@mui/material";

type AboutViewProps = {
  width: number;
  height: number;
};

const AboutView: FunctionComponent<AboutViewProps> = ({ width, height }) => {
  const [readmeContent, setReadmeContent] = useState<string>("");

  useEffect(() => {
    // Fetch README content from the repo URL
    fetch('https://raw.githubusercontent.com/magland/nbfiddle/main/README.md')
      .then(response => response.text())
      .then(content => {
        setReadmeContent(content);
      })
      .catch(console.error);
  }, []);

  return (
    <Box sx={{ padding: 2, width: width - 32, height: height - 16, overflowY: 'auto' }}>
      <ReactMarkdown>{readmeContent}</ReactMarkdown>
    </Box>
  );
};

export default AboutView;
