# be-crm

## Description
This project is a uni-app based CRM demo that showcases how to manage stores, customers,
appointments and purchase/consume records inside a single mobile-friendly console. It ships with
rich Vue 2 pages (for example `pages/home`, `pages/my-customers`, `pages/my-shops`, `pages/bookings`)
and calls uniCloud cloud objects such as `curd-shops`, `curd-customers`, `curd-booking`,
`analytics` and more.

## Software Architecture
- **Client:** Vue 2 + uni-app single codebase that targets mobile/H5/mini-app runtimes. Reusable UI
  atoms live in `src/components` and the larger feature pages live under `pages/`.
- **Cloud Functions:** Located in `uniCloud-aliyun/cloudfunctions/` and `uni_modules/*/uniCloud/`.
  They expose CRUD style uniCloud objects (`curd-*`, `stats-*`, etc.) that the client imports via
  `uniCloud.importObject`.
- **Local utilities:** `utils/customersStore.js` and `utils/shopsStore.js` provide lightweight
  persistence for mock data when the cloud back end is unavailable.

## Installation
1. Install [HBuilderX](https://www.dcloud.io/hbuilderx.html) or ensure you have the uni-app CLI.
2. Install dependencies for the cloud functions you plan to run (`npm install` inside each
   cloudfunction folder when necessary).
3. Open the project in HBuilderX (or run `npm install` at the repo root if you want to leverage the
   CLI tooling).

## Instructions
1. Start the dev server with HBuilderX or `npm run dev:h5` (depending on your target platform).
2. Configure uni-id and the supplied cloud objects if you want to persist real data; otherwise use
   the mock storage helpers to experiment locally.
3. Use the feature pages to manage shops, customers, bookings and analytics dashboards.

## Contribution
1.  Fork the repository
2.  Create `feat_xxx` branch
3.  Commit your code
4.  Create Pull Request

## Gitee Features
1.  You can use `README_XXX.md` to support different languages, such as `README_en.md`,
    `README_zh.md`.
2.  Gitee blog [blog.gitee.com](https://blog.gitee.com)
3.  Explore open source project [https://gitee.com/explore](https://gitee.com/explore)
4.  The most valuable open source project [GVP](https://gitee.com/gvp)
5.  The manual of Gitee [https://gitee.com/help](https://gitee.com/help)
6.  The most popular members  [https://gitee.com/gitee-stars/](https://gitee.com/gitee-stars/)
