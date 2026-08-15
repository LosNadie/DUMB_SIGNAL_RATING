import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import { catalogDetailRouteComponents } from './catalogRouteLoaders'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash }
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: () => import('../views/HomeView.vue') },
        { path: 'music', name: 'music', component: () => import('../views/ReviewsView.vue') },
        { path: 'music/:id', name: 'music-detail', component: catalogDetailRouteComponents.music },
        { path: 'anime', name: 'anime', component: () => import('../views/AnimeListView.vue') },
        { path: 'anime/:id', name: 'anime-detail', component: catalogDetailRouteComponents.anime },
        { path: 'movie', name: 'movie', component: () => import('../views/MovieListView.vue') },
        { path: 'movie/:id', name: 'movie-detail', component: catalogDetailRouteComponents.movie },
        { path: 'search', name: 'search', component: () => import('../views/SearchView.vue') },
        { path: 'profile', name: 'profile', component: () => import('../views/ProfileView.vue') },
        { path: 'about', name: 'about', component: () => import('../views/AboutView.vue') },
        { path: 'admin', name: 'admin', component: () => import('../views/admin/AdminDashboardView.vue') },
      ],
    },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  ],
})

export default router
