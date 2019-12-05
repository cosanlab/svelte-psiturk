# Svelte PsiTurk Experiment Scaffold

This project scaffold uses [SvelteJS](https://svelte.dev/) as a frontend UI + [PsiTurk](https://psiturk.org/) as a backend to run online experiments.  

- [Getting Started](#getting-started)
    - [One time setup](#one-time-setup)
    - [Experiment configuration](#experiment-configuration)
- [Developing](#developing)
    - [PsiTurk Development](#working-on-psiturk-features)
    - [SvelteJS Development](#working-on-sveltejs-features)
- [Deploying Live](#deploying-live)
- [Application Structure](#application-structure)
    - [Data management](#data-management)

# Getting Started

## One time setup
1. Install PsiTurk if you don't have it: `pip install psiturk` **requires Python 2**
2. Install [node](https://nodejs.org/en/download/) if you don't have it
3. Run `npm install` within this directory, which will create a `node_modules` folder
3. [Configure Google firebase](https://firebase.google.com/docs/web/setup) to store experiment data

## Experiment configuration
1. Edit `config.txt` with your settings using this [reference](https://psiturk.readthedocs.io/en/latest/configuration.html#local-configuration-file)
2. Launch psiturk server by running `psiturk` within this folder
3. Start the server using `server on`
3. Switch sandbox to live mode, create HITs, monitor account, approve workers etc using the [command line interface](https://psiturk.readthedocs.io/en/latest/command_line_overview.html)

# Developing

Refer to the [application structure](#application-structre) diagram below to understand what parts of the app under PsiTurk control or SvelteJS control.

## Working on PsiTurk features

To change the content of the experiment ad, hit accept screen, or consent, edit the relevant HTML files within the `templates/` directory. *These files are under PsiTurk control*. 

You can see changes made to these templates by launching a psiturk server (steps 2-3 of [experiment configuration](#experiment-configuration)) and refreshing your browser page.

## Working on SvelteJS features

To change the core experiment instructions, quiz, logic, etc edit the relevant files under the `src/` directory. *These files are under SvelteJS control*. 

For convenience, you can work on these files *independently* of the PsiTurk server using a javascript development server. Use the command `npm run dev` in this directory to launch one, then go to `localhost:5000` in your browser. What you see is what a user will see *after they accept and consent to a HIT*. The page will refresh automatically on any code changes, but PsiTurk related features (e.g. HIT submission) will not be available. 

# Deploying Live

*This section is a work in progress*

1. Package the SvelteJS UI for use in PsiTurk with the command `npm run build`
2. Configure and deploy PsiTurk's server to an online host (e.g. [heroku](https://psiturk.readthedocs.io/en/latest/heroku.html))

# Application Structure

PsiTurk and SvelteJS handle distinct non-overlapping responsibilities as users move through the app according to the diagram below.

PsiTurk responsibilities are outlined in purple and are primarily concerned with Mturk flow and Mturk metadata storage in a SQL database. SvelteJS handles experiment specific flow and stores experiment specific data in Google Firebase. 

![](/user_flow.png)

## Data Management

All data is stored in firebase database including participant responses, what trial they're currently on, and application state (i.e. whether a participant is viewing the instructions, completing the experiment, doing the debrief, etc). 

All stimuli are stored in firebase storage and accessed directly to make it easy to render audio files in HTML with fixed URLs.