import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHistory } from 'vue-router'

import LevelsView from '@/views/LevelsView.vue'
import MainView from '@/MainView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import WelcomeView from '@/views/WelcomeView.vue'

import { isLevelId } from '@/domain/progress'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: WelcomeView,
  },
  {
    path: '/levels',
    name: 'levels',
    component: LevelsView,
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: StatisticsView,
  },
  {
    path: '/game/:levelId',
    name: 'game',
    component: MainView,
    props: route => ({
      levelId: Number(route.params.levelId),
      resumeRequested: route.query.resume === '1',
    }),
    beforeEnter: (route) => {
      return isLevelId(Number(route.params.levelId)) ? true : { name: 'levels' }
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'home' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
