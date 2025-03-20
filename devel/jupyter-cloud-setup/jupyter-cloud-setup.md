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

Start a tmux session
- cond
- later to attache: tmux a -t jupyter

conda activate nbfiddle

Start jupyter lab

jupyter lab --NotebookApp.allow_origin='https://nbfiddle.app' --NotebookApp.token=${JUPYTER_TOKEN} --NotebookApp.disable_check_xsrf="True" --no-browser --port=8888 --ip=0.0.0.0 --MappingKernelManager.cull_interval="300" --MappingKernelManager.cull_idle_timeout="300" --MappingKernelManager.cull_connected="True"

# important: --ip=0.0.0.0 allows the server to be accessed from outside the droplet

Configure nbfiddle to use your server's url and token

But this only works on localhost. We need https!

So let's do this step by step.

Log in as root

apt-get install nginx -y

Configure domain to point to the droplet's IP
- For example jupyter1.nbfiddle.org
- Add an A record to your domain's IP

apt-get install certbot python3-certbot-nginx -y

Make sure port 80 is open in the firewall on digital ocean
- In firewall, allow incoming http and https traffic

certbot --nginx -d jupyter1.nbfiddle.org

Get the following message:
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/jupyter1.nbfiddle.org/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/jupyter1.nbfiddle.org/privkey.pem
This certificate expires on 2025-06-12.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

nano /etc/nginx/sites-available/default

Add the following in the server section for 443

location / {
    proxy_pass http://127.0.0.1:8888/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

# to check
nxing -t

systemctl restart nginx


Now let's go back and start the jupyer notebook

Log in as anaconda

tmux a -t jupyter

conda activate nbfiddle

Start jupyter lab

jupyter lab --NotebookApp.allow_origin_pat='^(https://nbfiddle\.app|http://localhost:5173|https://neurosift.app)$' --NotebookApp.token=${JUPYTER_TOKEN} --NotebookApp.disable_check_xsrf="True" --no-browser --port=8888 --ip=0.0.0.0 --NotebookApp.allow_remote_access="True" --MappingKernelManager.cull_interval="300" --MappingKernelManager.cull_idle_timeout="300" --MappingKernelManager.cull_connected="True"

Note the allow_remote_access flag and the allow_origin_pat flag

Now test it out by going to https://jupyter1.nbfiddle.org - you'll need to put in the token
