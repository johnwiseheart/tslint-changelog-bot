module.exports = (app) => {
  const regex = /#### CHANGELOG.md entry:\s*(.*)/;

  const getChangelog = async context => {
    const resp = await context.github.pullRequests.get(context.issue());
    const { body } = resp.data;
    const bodyNoComments = body.replace(/<!--.*?-->/g, "");
    const matches = regex.exec(bodyNoComments)
    if (matches != null) {
      return matches[1];
    }

    return undefined;
  }

  const getBranchDetails = context => {
    const check_suite = context.payload.check_suite;
    if (check_suite != null) {
      return check_suite;
    } else {
      const pr = context.payload.pull_request;
      const ret = {
        head_branch: pr.head.ref,
        head_sha: pr.head.sha,
      }
      return ret
    }
  }

  const setCheck = (context, head_branch, head_sha, success) => {
    return context.github.checks.create(context.repo({
        name: 'Changelog bot',
        head_branch,
        head_sha,
        conclusion: success ? 'success' : 'failure',
        completed_at: new Date((new Date()).getTime() + 1000),
        output: {
          title: success ? 'Changelog entry found' : 'Changelog entry not found',
          summary: success ? 'Changelog looks good' : 'You need to add entries to the changelog section in the body of this PR.',
        }
    }))
  }

  const check = async context => {
    const { head_branch, head_sha } = getBranchDetails(context);
    const changelog = await getChangelog(context);
    const success = changelog !== undefined && changelog.length > 0;
    return setCheck(context, head_branch, head_sha, success);
  }

  app.on([
    'pull_request.opened',
    'pull_request.edited',
    'pull_request.labeled',
    'pull_request.unlabeled',
    'pull_request.synchronize',
    'check_suite.requested',
    'check_run.rerequested'
  ], check)
}
