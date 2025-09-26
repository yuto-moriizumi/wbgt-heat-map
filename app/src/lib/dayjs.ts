import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/ja';

// Enable timezone and utc plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export default dayjs;