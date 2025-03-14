Create a digital ocean droplet
- Choose Anaconda Marketplace image
- Choose a droplet size
- Choose a root password
- Choose a hostname

Enable 8888 inbound traffic in firewall
- Custom TCP 8888
- Don't forget to add the dropet to the firewall

Log in as root

Set a password for the anaconda user
- passwd anaconda

ssh anaconda@localhost

Initialize conda
- anaconda3/bin/conda init
- logout and login again

create a new conda environment
- conda create -n nbfiddle python=3.9
- conda activate nbfiddle

Install jupyter and other packages
- pip install jupyter jupyterlab scipy numpy matplotlib pandas scikit-learn seaborn

Choose a secret token
# Be sure not to use special characters
export JUPYTER_TOKEN="yoursecrettoken"
And add it to your .bashrc

Start jupyter lab

jupyter lab --NotebookApp.allow_origin='http://localhost:5173' --NotebookApp.token=${JUPYTER_TOKEN} --NotebookApp.disable_check_xsrf="True" --no-browser --port=8888 --ip=0.0.0.0

# important: --ip=0.0.0.0 allows the server to be accessed from outside the droplet

Configure nbfiddle to use your server's url and token






