# Parse server jobs scheduler

## Note 
It's better to use [cron job](https://docs.parseplatform.org/cloudcode/guide/#scheduling-a-job) instead of using this library.
You have to handle the concurrency issue since this plugin is running by parse server's workers if cluster is true.

## How to use it?

### Install the library

```sh
$ npm install parse-server-jobs-scheduler --save
```

### Add those lines your Parse Cloud code main file

```js
const Scheduler = require('parse-server-jobs-scheduler').default;
const scheduler = new Scheduler();

// Recreates all crons when the server is launched
scheduler.recreateScheduleForAllJobs();

// Recreates schedule when a job schedule has changed
Parse.Cloud.afterSave('_JobSchedule', async (request) => {
  scheduler.recreateSchedule(request.object.id)
});

// Destroy schedule for removed job
Parse.Cloud.afterDelete('_JobSchedule', async (request) => {
  scheduler.destroySchedule(request.object.id)
});
```
