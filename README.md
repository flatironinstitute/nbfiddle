# nbfiddle

[nbfiddle.org](https://nbfiddle.org) – A streamlined approach to Python Jupyter notebooks

[View the source code on GitHub or submit an issue](https://github.com/flatironinstitute/nbfiddle)

## Overview

nbfiddle is a web-based Jupyter notebook interface that leverages your browser’s storage for saving and managing notebooks. It is designed for self-contained Python notebooks that focus on data analysis, particularly when working with remote data sources such as the DANDI archive.

Here is an example notebook, hosted as a GitHub Gist, with interactive Plotly graphs when opened in nbfiddle: [plotly-demo-for-nbfiddle.ipynb](https://nbfiddle.org/?url=https://gist.github.com/magland/366cfffb025dd3cfee27e5cadb3d7f53%23file-plotly-demo-for-nbfiddle-ipynb)

## Use Cases

1. **Opening a Notebook hosted on GitHub**
   Typically, to interact with a notebook on GitHub, you need to clone the repository or download the notebook, then open it in JupyterLab or VS Code. With nbfiddle, you simply use the notebook’s GitHub URL as a query parameter to launch an interactive version immediately. If you want to run the code, you can connect to a local JupyterLab server or use a publicly hosted server. Your edits are stored in your browser, but the link to the original GitHub version remains, so you can revert at any time. This approach removes the need to manage local files and lets you share an interactive notebook URL with colleagues—no downloads required.

2. **Publishing and Sharing Your Notebook**
   If you want to share a notebook, you might normally push it to a Git repository. With nbfiddle, you can publish your notebook directly to a GitHub Gist and instantly share the link. As you continue refining the notebook, it’s easy to push updates back to that same Gist.

3. **Quick Local Experiments**
   For quick experimentation, it’s common to end up with many local files named `Untitled (x).ipynb`. With nbfiddle, you can start a new notebook without creating any local files—everything lives in your browser’s storage. If you do decide you’d like a copy on disk, you can download it any time. Or. as mentioned above, you can easily share it as a Gist.

## Features

- Edit a notebook with changes saved directly to your browser’s storage
- Download the notebook as `.ipynb`
- Download the notebook as a Jupytext `.py` file
- Publish a notebook as a new GitHub Gist
- Update an existing GitHub Gist with changes
- Open an interactive notebook view from a GitHub repo or Gist
- Keep local browser copies of remote notebooks
- Revert local changes to the remote version
- Browse and manage your browser-stored notebooks
- Import `.ipynb` or Jupytext `.py` files from your local machine
- Connect to a local or public JupyterLab server for code execution
- Host your own remote JupyterLab server
- Use experimental AI code completion (requires an OpenRouter key)

## Notes

- Because nbfiddle does not include the text/html representation of Plotly figures, notebooks containing Plotly charts are typically much smaller in disk size.
- While GitHub's native notebook rendering can be useful, advanced features like interactive Plotly charts are not supported there.
- nbfiddle focuses on editing single self-contained notebooks and does not support importing additional Python files.
- It is not intended to replace JupyterLab; instead, it provides a lightweight, browser-based environment for single-file editing and sharing.
- To use nbfiddle with a JupyterLab server, that server must be started with the required flags and options for external connections. Currently, connections to JupyterHub are not supported.
