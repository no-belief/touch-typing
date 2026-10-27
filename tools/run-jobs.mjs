const REPO = 'no-belief/touch-typing';
const RUN = '40465243583';
const UA = { 'user-agent': 'dsh-deploy-check' };
const r = await fetch('https://api.github.com/repos/' + REPO + '/actions/runs/' + RUN + '/jobs', { headers: UA });
const d = await r.json();
for (const job of d.jobs || []) {
  console.log('JOB', job.name, '|', job.conclusion);
  for (const st of job.steps || []) {
    console.log('   ', st.number, st.conclusion || st.status, '-', st.name);
  }
}
