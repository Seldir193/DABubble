'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">dabubble documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AddMembersDialogComponent.html" data-type="entity-link" >AddMembersDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AddMembersDialogMobileComponent.html" data-type="entity-link" >AddMembersDialogMobileComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AppComponent.html" data-type="entity-link" >AppComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AuthActionComponent.html" data-type="entity-link" >AuthActionComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AvatarComponent.html" data-type="entity-link" >AvatarComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ChannelDialogComponent.html" data-type="entity-link" >ChannelDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ChatComponent.html" data-type="entity-link" >ChatComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ChatHeaderComponent.html" data-type="entity-link" >ChatHeaderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DevspaceComponent.html" data-type="entity-link" >DevspaceComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DirectMessagesComponent.html" data-type="entity-link" >DirectMessagesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/EditChannelDialogComponent.html" data-type="entity-link" >EditChannelDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/EntwicklerteamComponent.html" data-type="entity-link" >EntwicklerteamComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FooterComponent.html" data-type="entity-link" >FooterComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/HeaderComponent.html" data-type="entity-link" >HeaderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ImprintComponent.html" data-type="entity-link" >ImprintComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/InnerChannelComponent.html" data-type="entity-link" >InnerChannelComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IntroComponent.html" data-type="entity-link" >IntroComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LoginComponent.html" data-type="entity-link" >LoginComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MemberListDialogComponent.html" data-type="entity-link" >MemberListDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MembersDialogComponent.html" data-type="entity-link" >MembersDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MemberSectionDialogComponent.html" data-type="entity-link" >MemberSectionDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NewPasswortComponent.html" data-type="entity-link" >NewPasswortComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PasswortResetComponent.html" data-type="entity-link" >PasswortResetComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PrivacyComponent.html" data-type="entity-link" >PrivacyComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PrivateMessagesComponent.html" data-type="entity-link" >PrivateMessagesComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProfilDialogComponent.html" data-type="entity-link" >ProfilDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SearchFieldComponent.html" data-type="entity-link" >SearchFieldComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SelectedMembersDialogComponent.html" data-type="entity-link" >SelectedMembersDialogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SignupComponent.html" data-type="entity-link" >SignupComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ThreadChannelComponent.html" data-type="entity-link" >ThreadChannelComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ThreadComponent.html" data-type="entity-link" >ThreadComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/VerifyEmailComponent.html" data-type="entity-link" >VerifyEmailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/WelcomeScreenComponent.html" data-type="entity-link" >WelcomeScreenComponent</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AppStateService.html" data-type="entity-link" >AppStateService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ChannelService.html" data-type="entity-link" >ChannelService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MessageService.html" data-type="entity-link" >MessageService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UserService.html" data-type="entity-link" >UserService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AddMembersDialogData.html" data-type="entity-link" >AddMembersDialogData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AddMembersMobileData.html" data-type="entity-link" >AddMembersMobileData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BroadcastMessageData.html" data-type="entity-link" >BroadcastMessageData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChannelMessageData.html" data-type="entity-link" >ChannelMessageData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EmojiItem.html" data-type="entity-link" >EmojiItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FirestoreMessageData.html" data-type="entity-link" >FirestoreMessageData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Member.html" data-type="entity-link" >Member</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MemberListDialogData.html" data-type="entity-link" >MemberListDialogData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Message.html" data-type="entity-link" >Message</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MessageContent.html" data-type="entity-link" >MessageContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MessageContent-1.html" data-type="entity-link" >MessageContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MessageContent-2.html" data-type="entity-link" >MessageContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MessageContent-3.html" data-type="entity-link" >MessageContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProfileData.html" data-type="entity-link" >ProfileData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ThreadChannelParentDoc.html" data-type="entity-link" >ThreadChannelParentDoc</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ThreadChannelParentDoc-1.html" data-type="entity-link" >ThreadChannelParentDoc</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});