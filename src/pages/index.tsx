import { useEffect, useState } from 'react';
import { Auth, type IMatch, Match } from '@/lib/firebase';
import { Provider } from 'jotai';
import { create } from 'zustand';
import { produce } from 'immer';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Nullable } from '@/utils/types';
import { type User } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';
import { IcHome } from '@/components/icons/ic-home';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import get from 'lodash/get';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/utils/cn';
import { IcMinus } from '@/components/icons/ic-minus';
import { IcPlus } from '@/components/icons/ic-plus';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IcCopy } from '@/components/ui/ic-copy';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import toast from 'react-hot-toast';
import { Separator } from '@/components/ui/separator';
import { IcPen } from '@/components/icons/ic-pen';

const useAuth = create<{
  user: Nullable<User>;
  setUser: (user: Nullable<User>) => void;
  status: 'loading' | 'authorized' | 'unauthorized';
  setStatus: (status: 'authorized' | 'unauthorized') => void;
}>(set => ({
  user: null,
  setUser: user =>
    set(state =>
      produce(state, draft => {
        draft.user = user;
      })
    ),
  status: 'loading',
  setStatus: status =>
    set(state =>
      produce(state, draft => {
        draft.status = status;
      })
    ),
}));

function useControl() {
  const [params, setParams] = useSearchParams();
  const key = 'm';
  const id = params.get(key);
  function openMatch(id: string) {
    params.set(key, id);
    setParams(params);
  }
  return { id, key, openMatch };
}

export default function Page() {
  const { id } = useControl();
  const status = useAuth(state => state.status);
  const copy = useCopyToClipboard();
  return (
    <Provider>
      {status !== 'loading' && (
        <div className="container h-full flex flex-col">
          <header className="flex justify-between items-center pt-2 pb-0">
            <img src="/favicon.svg" alt="app-icon" className="size-5" />
            <div className="flex gap-2">
              <UserInfo />
              <AuthButton />
            </div>
          </header>
          <nav className="px-1 py-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Button asChild>
                    <Link to="/">
                      <IcHome />
                    </Link>
                  </Button>
                </BreadcrumbItem>
                {id && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Match {id}</BreadcrumbPage>
                      <button
                        onClick={() =>
                          copy(id).then(() => toast.success('Copied', { id: 'copied' }))
                        }
                      >
                        <IcCopy />
                      </button>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
          {status === 'authorized' && (
            <section className="hide-scrollbar min-h-0 flex-1 overflow-auto">
              {!id ? <Dashboard /> : <MatchBoard id={id} />}
            </section>
          )}
          {status === 'unauthorized' && (
            <p className="font-bold text-xl text-center m-10">Login to continue</p>
          )}
        </div>
      )}
      <AuthObserver />
    </Provider>
  );
}

const auth = new Auth();

function AuthObserver() {
  const setStatus = useAuth(state => state.setStatus);
  const setUser = useAuth(state => state.setUser);
  useEffect(() => {
    return auth.onStateChanged(user => {
      setStatus(!user ? 'unauthorized' : 'authorized');
      setUser(user);
    });
  }, [setStatus, setUser]);
  return null;
}

function UserInfo() {
  const user = useAuth(state => state.user);
  if (!user) return <p className="text-sm">Guest</p>;
  const email = user.email;
  if (!email) return <p className="text-sm">User {user.uid}</p>;
  return <div>{get(email.split('@'), 0)}</div>;
}

function AuthButton() {
  const user = useAuth(state => state.user);
  const [isOpen, setOpen] = useState(false);
  const [, setParams] = useSearchParams();
  async function logout() {
    await auth.logout();
    setParams();
  }
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!user ? (
        <DialogTrigger asChild>
          <Button>Login</Button>
        </DialogTrigger>
      ) : (
        <Button onClick={logout}>Logout</Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
        </DialogHeader>
        <LoginForm onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({ onSubmitted }: { onSubmitted: VoidFunction }) {
  const [error, setError] = useState('');
  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1)
      .email()
      .transform(val => val.toLowerCase()),
    password: z.string().trim().min(6).max(32),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'demo@abc.xyz', password: '1234567890' },
  });

  const onSubmit = form.handleSubmit(async payload => {
    try {
      await auth.login(payload.email, payload.password);
      onSubmitted();
    } catch {
      setError('Something went wrong!');
    }
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input autoComplete="email" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <div className="space-y-2">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Submit
        </Button>
        <p className="text-destructive">{error}</p>
      </form>
    </Form>
  );
}

const match = new Match();

function Dashboard() {
  const { openMatch } = useControl();
  const { mutate: create, isPending: isPendingCreate } = useMutation({
    mutationFn: () => match.create().then(snapshot => snapshot.id),
    throwOnError: false,
    onSuccess: openMatch,
  });

  const [value, setValue] = useState('');
  const { mutate: find, isPending: isPendingFind } = useMutation({
    mutationFn: (id: string) => match.get(id),
    onSuccess: data => (!data ? toast.error('Not found', { id: 'not-found' }) : openMatch(data.id)),
    onError: () => toast.error('Something went wrong', { id: 'something-went-wrong' }),
  });

  const isPending = isPendingCreate || isPendingFind;
  return (
    <div className="space-y-10 my-4">
      <Separator />
      <div className="flex justify-center">
        <Button disabled={isPending} onClick={() => create()}>
          New
        </Button>
      </div>
      <Separator />
      <div className="flex gap-2 px-2">
        <div className="flex-1">
          <Input
            className="w-full"
            placeholder="Enter existing ID"
            disabled={isPending}
            value={value}
            onChange={event => setValue(event.target.value)}
          />
        </div>
        <div>
          <Button disabled={isPending || !value} onClick={() => find(value)}>
            Find
          </Button>
        </div>
      </div>
    </div>
  );
}

function MatchBoard({ id }: { id: string }) {
  const [data, setData] = useState<Nullable<IMatch>>(null);
  useEffect(() => {
    return match.onListener(id, setData);
  }, [id]);
  const [tab, setTab] = useState<'st' | 'nd' | 'rd'>('st');
  if (!data) return null;
  const props = { data, id };
  return (
    <Tabs
      value={tab}
      onValueChange={newValue => {
        if (newValue === 'st' || newValue === 'nd' || newValue === 'rd') setTab(newValue);
      }}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="st">1st</TabsTrigger>
        <TabsTrigger value="nd">2nd</TabsTrigger>
        <TabsTrigger value="rd">3rd</TabsTrigger>
      </TabsList>
      <MatchBoardContent {...props} tab="st" />
      <MatchBoardContent {...props} tab="nd" />
      <MatchBoardContent {...props} tab="rd" />
    </Tabs>
  );
}

function MatchBoardContent({
  data,
  id,
  tab,
}: {
  data: IMatch;
  id: string;
  tab: 'st' | 'nd' | 'rd';
}) {
  const { mutate: updateScore, isPending: isPendingUpdateScore } = useMutation({
    mutationFn: (args: ['a' | 'b', number]) => match.updateScore(id, tab, ...args),
    throwOnError: false,
  });
  const [isPendingPlayer, setPendingPlayer] = useState(false);
  async function updateServe(team: 'a' | 'b', idx: 0 | 1, checked: 'indeterminate' | boolean) {
    if (checked !== true) return;
    const player = produce(data.set[tab].player, draft => {
      draft.a[0].serve = false;
      draft.a[1].serve = false;
      draft.b[0].serve = false;
      draft.b[1].serve = false;
      draft[team][idx].serve = true;
    });
    setPendingPlayer(true);
    try {
      await match.updatePlayer(id, tab, player);
    } finally {
      setPendingPlayer(false);
    }
  }
  async function updateSwap(team: 'a' | 'b') {
    const player = produce(data.set[tab].player, draft => {
      draft[team].reverse();
    });
    setPendingPlayer(true);
    try {
      await match.updatePlayer(id, tab, player);
    } finally {
      setPendingPlayer(false);
    }
  }
  const isPending = isPendingUpdateScore || isPendingPlayer;
  return (
    <TabsContent value={tab} className="grid grid-cols-2 gap-1 mt-0">
      <Card className="mt-2">
        <div>
          <DialogNameForm id={id} data={data} tab={tab} team="a" />
          <p className="text-center text-5xl font-bold">{data.set[tab].score.a}</p>
          <DialogPlayerNameForm id={id} data={data} tab={tab} team="a" />
        </div>
      </Card>
      <Card className="mt-2">
        <div>
          <DialogNameForm id={id} data={data} tab={tab} team="b" />
          <p className="text-center text-5xl font-bold">{data.set[tab].score.b}</p>
          <DialogPlayerNameForm id={id} data={data} tab={tab} team="b" />
        </div>
      </Card>
      <Drawer>
        <DrawerTrigger className="mt-2 col-span-2 inline-flex items-center justify-center h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium">
          <IcPen className="mr-2" />
          Update
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      disabled={isPending || data.set[tab].score.a === 0}
                      onClick={() => updateScore(['a', -1])}
                    >
                      <IcMinus />
                    </Button>
                    <div className="flex-1">
                      <p className="font-bold text-center text-4xl">{data.set[tab].score.a}</p>
                    </div>
                    <Button size="icon" disabled={isPending} onClick={() => updateScore(['a', 1])}>
                      <IcPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-1 items-center justify-end">
                      <Label
                        htmlFor="player-a-0-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data.set[tab].player.a[0].name}
                      </Label>
                      <Checkbox
                        className="size-5"
                        id="player-a-0-name"
                        checked={data.set[tab].player.a[0].serve}
                        disabled={isPending}
                        onCheckedChange={checked => updateServe('a', 0, checked)}
                      />
                    </div>
                    <div className="flex gap-1 items-center justify-end">
                      <Label
                        htmlFor="player-a-1-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data.set[tab].player.a[1].name}
                      </Label>
                      <Checkbox
                        className="size-5"
                        id="player-a-1-name"
                        checked={data.set[tab].player.a[1].serve}
                        disabled={isPending}
                        onCheckedChange={checked => updateServe('a', 1, checked)}
                      />
                    </div>
                    <Button className="w-full" disabled={isPending} onClick={() => updateSwap('a')}>
                      Swap
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      disabled={isPending || data.set[tab].score.b === 0}
                      onClick={() => updateScore(['b', -1])}
                    >
                      <IcMinus />
                    </Button>
                    <div className="flex-1">
                      <p className="font-bold text-center text-4xl">{data.set[tab].score.b}</p>
                    </div>
                    <Button size="icon" disabled={isPending} onClick={() => updateScore(['b', 1])}>
                      <IcPlus />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-1 items-center justify-start">
                      <Checkbox
                        className="size-5"
                        id="player-b-0-name"
                        checked={data.set[tab].player.b[0].serve}
                        disabled={isPending}
                        onCheckedChange={checked => updateServe('b', 0, checked)}
                      />
                      <Label
                        htmlFor="player-b-0-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data.set[tab].player.b[0].name}
                      </Label>
                    </div>
                    <div className="flex gap-1 items-center justify-start">
                      <Checkbox
                        className="size-5"
                        id="player-b-1-name"
                        checked={data.set[tab].player.b[1].serve}
                        disabled={isPending}
                        onCheckedChange={checked => updateServe('b', 1, checked)}
                      />
                      <Label
                        htmlFor="player-b-1-name"
                        className="text-xl overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {data.set[tab].player.b[1].name}
                      </Label>
                    </div>
                    <Button className="w-full" disabled={isPending} onClick={() => updateSwap('b')}>
                      Swap
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </TabsContent>
  );
}

function DialogNameForm({
  id,
  data,
  tab,
  team,
}: {
  id: string;
  data: IMatch;
  tab: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
}) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger className="w-full px-1">
        <p className="text-xl whitespace-nowrap overflow-hidden text-ellipsis">
          {data.set[tab].name[team]}
        </p>
      </DialogTrigger>
      <DialogContent>
        <NameForm
          id={id}
          set={tab}
          team={team}
          name={data.set[tab].name[team]}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  id,
  set,
  team,
  name,
  onSubmitted,
}: {
  id: string;
  set: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
  name: string;
  onSubmitted: VoidFunction;
}) {
  const schema = z.object({ name: z.string().min(1) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name },
  });
  const onSubmit = form.handleSubmit(async payload => {
    await match.updateName(id, set, team, payload.name);
    form.reset(payload);
    onSubmitted();
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Update
        </Button>
      </form>
    </Form>
  );
}

function DialogPlayerNameForm({
  id,
  data,
  tab,
  team,
}: {
  id: string;
  data: IMatch;
  tab: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
}) {
  const [isOpen, setOpen] = useState(false);
  const isPlayerServe = [
    data.set[tab].player[team][0].serve,
    data.set[tab].player[team][1].serve,
  ] as const;
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="px-2">
          <div
            className={cn(
              'flex items-center gap-2 justify-end',
              team === 'b' && 'flex-row-reverse'
            )}
          >
            <p className="whitespace-nowrap overflow-hidden text-ellipsis text-lg">
              {data.set[tab].player[team][0].name}
            </p>
            <div>
              <div className={cn('size-4 rounded-full', isPlayerServe[0] && 'bg-green-500')} />
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 justify-end',
              team === 'b' && 'flex-row-reverse'
            )}
          >
            <p className="whitespace-nowrap overflow-hidden text-ellipsis text-lg">
              {data.set[tab].player[team][1].name}
            </p>
            <div>
              <div className={cn('size-4 rounded-full', isPlayerServe[1] && 'bg-green-500')} />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <PlayerNameForm
          id={id}
          set={tab}
          team={team}
          name1={data.set[tab].player[team][0].name}
          name2={data.set[tab].player[team][1].name}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlayerNameForm({
  id,
  set,
  team,
  name1,
  name2,
  onSubmitted,
}: {
  id: string;
  set: 'st' | 'nd' | 'rd';
  team: 'a' | 'b';
  name1: string;
  name2: string;
  onSubmitted: VoidFunction;
}) {
  const schema = z.object({ name1: z.string().min(1), name2: z.string().min(1) });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name1, name2 },
  });
  const onSubmit = form.handleSubmit(async payload => {
    await match.updatePlayerName(id, set, team, payload.name1, payload.name2);
    form.reset(payload);
    onSubmitted();
  });

  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name1"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name player 1</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="name2"
            render={({ field }) => (
              <div className="space-y-1">
                <FormLabel>Name player 2</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </div>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Update
        </Button>
      </form>
    </Form>
  );
}
