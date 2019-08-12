import { CronJob } from 'cron';
import moment from 'moment';
import axios from 'axios';

const PARSE_TIMEZONE = 'UTC';
let cronJobs: { [id: string]: CronJob } = {};

export default class JobsScheduler {
  public recreateScheduleForAllJobs() {
    if (!Parse.applicationId) {
      throw new Error('Parse is not initialized');
    }

    const query = new Parse.Query('_JobSchedule');

    query.find({ useMasterKey: true })
      .then((jobSchedules) => {
        this.destroySchedules();

        jobSchedules.forEach((jobSchedule) => {
          try {
            this.recreateJobSchedule(jobSchedule);
          } catch (error) {
            console.log(error);
          }
        });
      });
  }

  public destroySchedules() {
    for (const id of Object.keys(cronJobs)) {
      this.destroySchedule(id);
    }

    cronJobs = {};
  }

  public recreateSchedule(jobId: string) {
    Parse.Object
      .extend('_JobSchedule')
      .createWithoutData(jobId)
      .fetch({ useMasterKey: true })
      .then((jobSchedule: Parse.Object) => {
        this.recreateJobSchedule(jobSchedule);
      });
  }

  public destroySchedule(jobId: string) {
    const cronJob = cronJobs[jobId];

    if (cronJob) {
      cronJob.stop();

      delete cronJobs[jobId];
    }
  }

  private recreateJobSchedule(job: Parse.Object) {
    this.destroySchedule(job.id);

    cronJobs[job.id] = this.createCronJob(job);
  }

  private createCronJob(jobSchedule: Parse.Object) {
    const startDate = new Date(jobSchedule.get('startAfter'));
    const repeatMinutes = jobSchedule.get('repeatMinutes');
    const jobName = jobSchedule.get('jobName');
    const params = jobSchedule.get('params');

    const performJob = () => this.performJob(jobName, params);

    // Launch just once
    if (!repeatMinutes) {
      return new CronJob(startDate, performJob, undefined, true, PARSE_TIMEZONE);
    }

    // Periodic job. Create a cron to launch the periodic job a the start date.
    return new CronJob(
      this.countCronTime(jobSchedule),
      performJob,
      undefined,
      true,
      PARSE_TIMEZONE,
    );
  }

  private performJob(jobName: string, params: any) {
    axios.post(Parse.serverURL + '/jobs/' + jobName, params, {
      headers: {
        'X-Parse-Application-Id': Parse.applicationId,
        'X-Parse-Master-Key': Parse.masterKey,
      },
    }).then(() => {
      console.log(`Job ${jobName} launched.`);
    }).catch((error) => {
      console.log(error);
    });
  }

  private countCronTime(jobSchedule: Parse.Object) {
    const timeOfDay = moment(jobSchedule.get('timeOfDay'), 'HH:mm:ss.Z').utc();
    const daysOfWeek = jobSchedule.get('daysOfWeek');
    const cronDoW = (daysOfWeek) ? this.daysOfWeekToCronString(daysOfWeek) : '*';

    const repeatMinutes = jobSchedule.get('repeatMinutes');
    const minutes = repeatMinutes % 60;
    const hours = Math.floor(repeatMinutes / 60);

    let cron = '0 ';
    // Minutes
    if (minutes) {
      cron += `${timeOfDay.minutes()}-59/${minutes} `;
    } else {
      cron += `0 `;
    }

    // Hours
    cron += `${timeOfDay.hours()}-23`;
    if (hours) {
      cron += `/${hours}`;
    }
    cron += ' ';

    // Day of month
    cron += '* ';

    // Month
    cron += '* ';

    // Days of week
    cron += cronDoW;

    return cron;
  }

  private daysOfWeekToCronString(daysOfWeek: number[]) {
    const daysNumbers = [];

    for (let i = 0; i < daysOfWeek.length; i++) {
      if (daysOfWeek[i]) {
        daysNumbers.push((i + 1) % 7);
      }
    }

    return daysNumbers.join(',');
  }
}
