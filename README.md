# nbfiddle

[nbfiddle.org](https://nbfiddle.org) - A streamlined way to work with Python notebooks

## What is nbfiddle?

nbfiddle is a web-based notebook interface that stores everything in your browser. It's designed for working with self-contained notebooks that focus on data analysis, particularly when streaming data from remote repositories like DANDI archive.

## How it Works

nbfiddle simplifies working with Python notebooks by removing file management overhead. Your changes are saved directly in your browser - no need to manage .ipynb files on your system. To use a notebook, simply point nbfiddle to its GitHub URL:

```
https://nbfiddle.org?url=https://github.com/owner/repo/blob/branch/path/notebook.ipynb
```

You can immediately start editing the notebook, and all changes are automatically saved in your browser. If you want to go back to the original version from GitHub, you can do so with a single click.

To run cells, connect nbfiddle to a Jupyter server - either running locally or using one of the cloud options (which require a secret token). Even without a Jupyter connection, you can still explore and edit notebooks.

This approach is ideal for notebooks that work with remote data sources, as there's no need to manage local data files. You can quickly test and modify notebooks without having to download or manage files on your system.
