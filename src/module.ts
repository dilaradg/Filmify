// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
// GPLv3

import { type ApolloDriverConfig } from '@nestjs/apollo';
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { DevModule } from './config/dev/module.js';
import { graphQlModuleOptions } from './config/graphql.js';
import { LoggerModule } from './logger/module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.js';
import { KeycloakModule } from './security/keycloak/module.js';
import { AdminModule } from './admin/module.js';
import { FilmModule } from './film/module.js'; // ✅ dein zentrales Modul

@Module({
  imports: [
    AdminModule,
    FilmModule,
    ConfigModule,
    DevModule,
    GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
    LoggerModule,
    KeycloakModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      // GraphQL-Endpunkt + evtl. Auth abfangen, keine Controller mehr nötig
      .forRoutes('auth', 'graphql');
  }
}
