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
import { AdminModule } from './admin/module.js';
import { FilmModule } from './film/module.js';
import { FilmController } from './film/controller/film-controller.js';
import { FilmWriteController } from './film/controller/film-write-controller.js';
import { DevModule } from './config/dev/module.js';
import { graphQlModuleOptions } from './config/graphql.js';
import { LoggerModule } from './logger/module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.js';
import { KeycloakModule } from './security/keycloak/module.js';

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
      .forRoutes(FilmController, FilmWriteController, 'auth', 'graphql');
  }
}
