const REPO = 'no-belief/touch-typing';
const RUN = '40465243583';
const UA = { 'user-agent': 'dsh-deploy-check' };
const jr = await fetch('https://api.github.com/repos/' + REPO + '/actions/runs/' + RUN + '/jobs', { headers: UA });
const d = await jr.json();
const job = (d.jobs || [])[0];
console.log('job id', job && job.id);
if (job) {
  const cr = await fetch('https://api.github.com/repos/' + REPO + '/check-runs/' + job.id, { headers: UA });
  const cd = await cr.json();
  console.log('check status', cr.status);
  const out = cd.output || {};
  console.log('title:', out.title);
  console.log('summary:', (out.summary || '').slice(0, 1200));
  console.log('text:', (out.text || '').slice(0, 1200));
  for (const a of out.annotations || []) console.log('annotation:', a.annotation_level, a.message);
}
