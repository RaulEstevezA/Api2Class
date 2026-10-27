$version: "2"

namespace example.api

structure Root {
    @required
    id: Long

    @required
    value: Document

    @required
    meta: Document

    @required
    matrix: LongListList

    @required
    points: PointList
}

structure Point {
    @required
    x: Double

    @required
    y: Long
}

list LongList {
    member: Long
}

list LongListList {
    member: LongList
}

list PointList {
    member: Point
}
