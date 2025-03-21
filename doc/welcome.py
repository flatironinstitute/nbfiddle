# %% [markdown]
# Welcome to nbfiddle, a streamlined approach to Python Jupyter notebooks

[View this notebook in nbfiddle](https://nbfiddle.app/?url=https://gist.github.com/magland/c5b5c777c093d8c8e9eb89857a52eb7b%23file-nbfiddle-welcome-ipynb) if you are not already doing so.

Now that you are viewing this notebook in nbfiddle, take a look at the browser address bar. The url query parameter is pointing to [this GitHub gist](https://gist.github.com/magland/c5b5c777c093d8c8e9eb89857a52eb7b#file-nbfiddle-welcome-ipynb). Of course you can see the rendered notebook there on GitHub, but there are some important advantages of viewing it on nbfiddle.

1. Plotly, Altair, etc, graphs are rendered here... and they're interactive! On GitHub you only see static images output from tools like matplotlib.
2. You can actually edit the cells in nbfiddle! Try double-clicking on this markdown cell.
3. You can even run cells within nbfiddle, once you are connected to a jupyter server. More details below.

Let's dive into some details.

# %% [markdown]
# Basic plotting

In the next cell, we make a simple plot using matplotlib. In this case, the output cell contains the actual image (PNG), so it is visible on GitHub as well.

# %%
import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 10, 100)
plt.figure(figsize=(10, 4))
plt.plot(x, np.sin(x) * np.exp(-x/5), 'o-', label='Wave', markevery=10)
plt.grid(True, alpha=0.3)
plt.title('Damped Sine Wave')
plt.legend()

# further down I"ll show you how to connect to a Jupyter server so you can modify and rerun.

# %% [markdown]
Next will make a similar plot using plotly. This time it's interactive (not just a static image) so it doesn't show up on GitHub, but it does render here in nbfiddle.

# %%
import plotly.express as px
import numpy as np

# Create some sample data
x = np.linspace(0, 10, 50)
y = np.sin(x) * np.exp(-x/5)

# Create an interactive scatter plot
fig = px.scatter(x=x, y=y, title='Interactive Damped Sine Wave')
fig.update_traces(mode='lines+markers')
fig.show()

# %% [markdown]
Similarly for Altair and other libraries.

# %%
import altair as alt
import numpy as np
import pandas as pd

# Generate some random data
np.random.seed(42)
data = pd.DataFrame({
    'x': np.arange(100),
    'y': np.random.randn(100).cumsum()
})

# Create the chart
chart = alt.Chart(data).mark_line().encode(
    x='x:Q',
    y='y:Q'
).properties(
    title='Simple Altair Line Chart'
)

chart

# %% [markdown]
# Executing cells

Now I'm sure you're eager to start playing around, modifying the above examples, making your own plots, etc. When you click on one of the above code cells you'll see a "not connected" message. That's because you are not connected to any Jupyter kernel.

You've got three options:

* Run your own JupyterLab server locally
* Connect to a public JupyterLab server in the cloud (unfortunately JupyterHub is not supported)
* Host your own server in the cloud (I can provide instructions if you want to go that route)

For the first option, you install JupyterLab on your computer and start the server with some special options to give permission for nbfiddle to connect to it.

For the second option, you'll need to reach out to the authors to get a special token to give you access to one of the public servers.

The third option is not especially easy to set up, but it can be really convenient.

**In either case, click on the "JUPYTER CONFIG" tab above and follow the instructions.**

Now that you're connected to a Jupyter Python kernel, you can edit the above cells an rerun them! Either click the play button, or use Ctrl+Enter or Shift+Enter (the latter advances to the next cell).

# %% [markdown]
# Modifications

When you edit a notebook, the changes are automatically saved in the browser (there's no Ctrl+S needed for saving). But of course it's not going to continually be uploading the new version to GitHub (you don't have permission anyway). Instead, you'll see a "Modified" notification above the notebook and two buttons: "REVERT" and "UPDATE". The revert button removes all local changes and brings you back to the version that's hosted on GitHub. The update option only works if you are the owner of the Gist. In that case, your changes are commited to the gist.

There are two types of nbfiddle notebooks:
* Hosted on GitHub either in a regular repository or as a gist.
* Stored locally under a notebook name.

**Important: if you clear your browser cache all your local edits and local notebooks will be lost**

We've already described how the first of these works. You can maintain your own local edits and optionally push back to the gist (if you are the owner).

The second is convenient for developing notebooks just locally without pushing them into the cloud. By default (if you just go to https://nbfiddle.app) you are working on the "default" notebook. You can also have other local notebooks, with their own names. For example, go to https://nbfiddle.app?localname=test1.

You can manage your local modifications for both types using the STORAGE tab above. It's good to periodically visit that tab to clean up old unused files.

# %% [markdown]
# Menu options

Take a look at the menu button above the notebook. Here's a description of the various choices.

## Import notebook

This lets you choose a file on your computer to import in nbfiddle. This can either be a .ipynb file or a .py (Jupytext) file. You can also paste in the raw text for one of these. If you check the box "replace existing notebook", it will replace the content of the current notebook. Otherwise it will prompt you for a local name.

## Download notebook

Download the notebook to your local machine as either .ipynb or .py (Jupytext). You can also copy the Jupytext to your clipboard.


## Save locally

You will be prompted for a name and nbfiddle will store it locally in the browser under that name. These notebooks cannot be shared with others.

## Save to cloud

If you want to share the notebook with others, select this option to either create a new GitHub gist, or update the existing gist. You will need to provide an access token that has permissions to write to gists.

## Clear all outputs and Clear notebook

These options clear the output cell or all cells in the current notebook.

## Open default notebook

Conveniently switch to the default notebook. This is useful if you want to quickly try something new.


# %% [markdown]
# Trusted notebooks

Because nbfiddle can display arbitrary HTML content in output cells, such cells will not display until the user has clicked that they trust the notebook. Even when the notebook is trusted, such content is sandboxed in an IFRAME so that it doesn't have access to the data in the browser (e.g., stored notebooks or access tokens).

Any imported or remote notebooks are untrusted by default, whereas notebooks created within nbfiddle are always trusted.

For example, here's an example of an embedded IFRAME which requires the user to trust the notebook.

# %%
from IPython.display import IFrame

IFrame(src="https://en.wikipedia.org/wiki/Python_(programming_language)",
       width="100%",
       height=400)

# %% [markdown]
# Notebooks in GitHub repositories

You can also point nbfiddle to notebooks in non-gist GitHub repositories. Just point the url query parameter to the GitHub url (i.e., https://github.com/owner/repo/blob/main/path/to/notebook.ipynb).

For gist urls, you'll notice the %23 in the url for this notebook. That's needed in place of the # character.


# %% [markdown]
# Markdown and code cells

You can toggle cells between markdown and Python code using the button in the upper-right section of input cells when you hover. Double-click to edit markdown, and execute the cell to switch back to markdown render mode.

# %% [markdown]
# Keyboard shortcuts

nbfiddle use some of the same keyboard shortcuts as other notebook programs such as JupyterLab. For example "a" to insert a cell before the active cell, "b" to add a cell after, and "x" to delete the current cell.

# %% [markdown]
# AI Features

nbfiddle has some optional AI features to assist with coding and content creation. See the SETTINGS tab where you can provide an OpenRouter API key and turn on **code completion** and/or **chat**.

Both of these assistants can see all the input cells of your notebook, and they are also aware of the active cell.

# %% [markdown]
# Some notes

* nbfiddle focuses on editing single self-contained notebooks and does not support importing additional Python files.
* This is not intended to replace JupyterLab; instead, it provides a lightweight, browser-based environment for single-file editing and sharing.
* Currently, connections to JupyterHub are not supported (sadly that's difficult).
* Plotly-specific advantage: Because nbfiddle does not include the text/html representation of Plotly figures, notebooks containing Plotly charts are typically a lot smaller on disk than with JupyterLab.

# %%
from IPython.display import HTML

html_content = """
<div style="
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    color: white;
    font-family: Arial, sans-serif;
">
    <h1>Thanks for trying nbfiddle!</h1>
</div>
"""

HTML(html_content)

# %% [markdown]
# Thanks for trying nbfiddle!

I hope you find nbfiddle useful for your research.

Don't forget to [star us on GitHub](https://github.com/flatironinstitute/nbfiddle) or reach out with any issues or suggestions.

