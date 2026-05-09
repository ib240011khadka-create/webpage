Netlify deployment notes

1. Set the Web3Forms access key as an environment variable in Netlify:

   - Key name: `WEB3FORMS_ACCESS_KEY`
   - Value: (the access key you received from Web3Forms)

2. The contact form will now POST to `/.netlify/functions/contact` (serverless proxy).

3. Local testing:

   - Install the Netlify CLI: `npm install -g netlify-cli`
   - Run locally with your env var set: `netlify dev` (CLI will pick up your env vars or use a `.env` file).

4. Security: do not commit the `WEB3FORMS_ACCESS_KEY` to the repo. Keep it only in Netlify site settings (or other host secret manager).
