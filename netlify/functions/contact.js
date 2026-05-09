// Netlify Function: proxy contact form to Web3Forms
// Set the Web3Forms access key in your Netlify site settings as `WEB3FORMS_ACCESS_KEY`.

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return { statusCode: 500, body: 'Server misconfigured: missing WEB3FORMS_ACCESS_KEY' };
  }

  // Basic bot-check on the server side as well
  if (body.botcheck && String(body.botcheck).trim() !== '') {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Bot detected' }),
    };
  }

  try {
    const params = new URLSearchParams();
    Object.keys(body).forEach((k) => {
      const v = body[k];
      if (Array.isArray(v)) {
        v.forEach((item) => params.append(k, String(item)));
      } else if (v !== undefined && v !== null) {
        params.append(k, String(v));
      }
    });

    params.append('access_key', accessKey);

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json();
    return {
      statusCode: res.status || 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message || 'Proxy error' }),
    };
  }
};
